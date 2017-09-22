import inspect
from celery.signals import before_task_publish, task_prerun
from celery import current_app, current_task

from call_tracker.client.client import (
    task_before_run,
    task_sent_task,
    task_sent_task_without_task,
)


@before_task_publish.connect
def on_before_task_publish(sender, body, headers, **signal_kwargs):
    task = current_app.tasks[sender].run
    args = inspect.getcallargs(task, *body[0], **body[1])

    if not current_task:
        task_sent_task_without_task(headers['id'], sender, args)
        return

    task_sent_task(current_task, current_task.request.id, headers['id'], sender, args)


@task_prerun.connect
def on_task_prerun(task, task_id, args, kwargs, **signal_kwargs):
    task_before_run(task, inspect.getcallargs(task.run, *args, **kwargs))
