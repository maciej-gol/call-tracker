import inspect
import json
import logging
import requests
import sys
import time
import urllib

from django.conf import settings


logger = logging.getLogger(__name__)


class Field(object):
    pass


class ProvenanceObjectMetaclass(type):
    def __new__(cls, class_name, bases, attrs):
        fields = set()
        for base in bases:
            fields |= getattr(base, '_fields', set())

        for key, value in attrs.items():
            if not isinstance(value, Field):
                continue

            fields.add(key)

        attrs['_fields'] = fields
        return (
            super(ProvenanceObjectMetaclass, cls)
            .__new__(cls, class_name, bases, attrs)
        )


class ProvenanceObject(object, metaclass=ProvenanceObjectMetaclass):
    def serialize(self):
        ret = {}
        for field_name in self._fields:
            value = getattr(self, field_name)
            if isinstance(value, ProvenanceObject):
                value = value.serialize()

            elif isinstance(value, Field):
                continue

            elif isinstance(value, list):
                value = [v.serialize() for v in value]

            ret[field_name] = value

        return ret


class Process(ProvenanceObject):
    label = Field()
    url = Field()


class ProcessRun(ProvenanceObject):
    label = Field()
    url = Field()
    process = Field()
    outputs = Field()
    inputs = Field()
    runs_started = Field()


class CeleryTaskRunOutputs(ProvenanceObject):
    def __init__(self, task, args, task_id=None):
        self.task_id = task_id or task.request.id
        self.args = args or {}

    def serialize(self):
        return [
            {
                'name': arg_name,
                'value': arg_value,
                'label': '{}={}'.format(arg_name, arg_value),
                'url': '{}#output#{}'.format(self.task_id, arg_name),
            }
            for arg_name, arg_value in self.args.items()
        ]


class CeleryTask(Process):
    def __init__(self, task):
        self.task_name = task if isinstance(task, str) else task.name

    @property
    def label(self):
        return 'celery:{}'.format(self.task_name)

    @property
    def url(self):
        return (
            '{}/tasks/{}'
            .format(settings.TRACKER_URL, self.task_name)
        )


class CeleryTaskRun(ProcessRun):
    def __init__(self, task=None, args=None, task_id=None):
        if args is not None:
            self.outputs = CeleryTaskRunOutputs(task=task, args=args, task_id=task_id)

        self.process = CeleryTask(task or task_id)
        self.task_name = task if isinstance(task, str) else task.name
        self.task_id = task.request.id if task_id is None else task_id

    @property
    def label(self):
        return 'celery:{}#{}'.format(self.task_name, self.task_id)

    @property
    def url(self):
        return (
            '{}/tasks/{}/{}'
            .format(settings.TRACKER_URL, self.task_name, self.task_id)
        )


class SimpleActionOutputs(ProvenanceObject):
    def __init__(self, action_name, args=None):
        self.action_name = action_name
        self.args = args or {}

    def serialize(self):
        return [
            {
                'name': arg_name,
                'value': arg_value,
                'label': '{}={}'.format(arg_name, arg_value),
                'url': '{}#output#{}'.format(self.action_name, arg_name),
            }
            for arg_name, arg_value in self.args.items()
        ]


class SimpleAction(Process):
    def __init__(self, action_name):
        self.action_name = action_name

    @property
    def label(self):
        return self.action_name

    @property
    def url(self):
        action_name = urllib.quote_plus(self.action_name)
        return '{}/actions/{}'.format(settings.TRACKER_URL, action_name)


class SimpleActionRun(ProcessRun):
    def __init__(self, action_name, args=None):
        self.action_name = action_name
        self.timestamp = time.time()
        self.process = SimpleAction(action_name)
        self.outputs = SimpleActionOutputs(action_name, args)

    @property
    def label(self):
        return '{}#{}'.format(self.action_name, self.timestamp)

    @property
    def url(self):
        action_name = urllib.quote_plus(self.action_name)
        return (
            '{}/actions/{}/{}'
            .format(settings.TRACKER_URL, action_name, self.timestamp)
        )


class DjangoView(Process):
    def __init__(self, request):
        self.request = request

    @property
    def label(self):
        view_name = self.request.resolver_match.view_name
        return 'django:{}'.format(view_name)

    @property
    def url(self):
        view_name = self.request.resolver_match.view_name
        return '{}/views/{}'.format(settings.TRACKER_URL, view_name)


class DjangoViewRun(ProcessRun):
    def __init__(self, request):
        self.request = request
        self.process = DjangoView(request)

    @property
    def label(self):
        abs_uri = self.request.build_absolute_uri(self.request.path)
        return '{}#{}'.format(abs_uri, time.time())

    @property
    def url(self):
        return self.label


def infer_action_from_current_stack():
    from celery import Task
    from django.core.handlers.wsgi import WSGIRequest

    for frame, _, _, f_name, _, _ in inspect.stack():
        request = frame.f_locals.get('request')
        if request and isinstance(request, WSGIRequest):
            return DjangoViewRun(request)

        task = frame.f_locals.get('task')
        if task and isinstance(task, Task):
            return CeleryTaskRun(task=task)

    return SimpleActionRun('cmd:{}'.format(' '.join(sys.argv[:2])))


def task_sent_task_without_task(called_task_id, called_task_name, args):
    logging.info(
        'task_sent_task_without_task(called_task=%s#%s)',
        called_task_name,
        called_task_id,
    )

    data = infer_action_from_current_stack()
    run_started = CeleryTaskRun(task_id=called_task_id, args=args, task=called_task_name)
    run_started.inputs = data.outputs = SimpleActionOutputs(action_name=data.url, args=args)
    data.runs_started = [run_started]
    requests.patch(
        '{}/api/graphs/{}/runs/'.format(settings.TRACKER_URL, settings.TRACKER_GRAPH_ID),
        data=json.dumps(data.serialize()),
        headers={'Content-Type': 'application/json'},
    )


def task_before_run(task, args):
    logging.info('task_before_run(task=%s#%s)', task.name, task.request.id)

    data = CeleryTaskRun(task)
    requests.patch(
        '{}/api/graphs/{}/runs/'.format(settings.TRACKER_URL, settings.TRACKER_GRAPH_ID),
        data=json.dumps(data.serialize()),
        headers={'Content-Type': 'application/json'},
    )


def task_sent_task(caller_task, caller_task_id, called_task_id, called_task_name, args):
    logging.info(
        'task_sent_task(caller_task=%s#%s, called_task=%s#%s)',
        caller_task.name,
        caller_task.request.id,
        called_task_name,
        called_task_id,
    )

    data = CeleryTaskRun(caller_task, args)
    run_started = CeleryTaskRun(task=called_task_name, task_id=called_task_id)
    run_started.inputs = data.outputs
    data.runs_started = [run_started]
    requests.patch(
        '{}/api/graphs/{}/runs/'.format(settings.TRACKER_URL, settings.TRACKER_GRAPH_ID),
        data=json.dumps(data.serialize()),
        headers={'Content-Type': 'application/json'},
    )
