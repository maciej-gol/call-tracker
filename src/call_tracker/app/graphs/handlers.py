from django.db.models import Q

from .models import Graph, Node, Relation


def create_graph():
    return Graph.objects.create(state=Graph.State.DONE)


def list_graphs():
    return Graph.objects.filter(state=Graph.State.DONE)


def create_or_update_run(graph_id, url, **kwargs):
    node, _ = Node.objects.get_or_create(
        defaults={
            'data': {},
            'type': 'process_run',
        },
        graph_id=graph_id,
        url=url,
    )
    if 'label' in kwargs:
        node.label = kwargs['label']
        node.save()

    process = kwargs.get('process')
    if process:
        process_node = create_or_update_process(process, graph_id)
        Relation.objects.get_or_create(
            defaults={
                'data': {},
                'type': 'process',
            },
            source=node,
            target=process_node,
        )
        runs = int(process_node.data['runs'])
        process_node.data['runs'] = str(runs + 1)
        process_node.save()

    inputs = kwargs.get('inputs', [])
    for run_input in inputs:
        create_or_update_run_input(node, run_input)

    outputs = kwargs.get('outputs', [])
    for run_output in outputs:
        create_or_update_run_output(node, run_output)

    runs_started = kwargs.get('runs_started', [])
    for run_started in runs_started:
        create_or_update_run(graph_id, **run_started)
        if 'process' not in run_started or not process:
            continue

        parent_process = Node.objects.get(type='process', url=process['url'])
        child_process = Node.objects.get(type='process', url=run_started['process']['url'])
        Relation.objects.get_or_create(
            defaults={'data': {}},
            source=parent_process,
            target=child_process,
            type='process_connection',
        )

    return node


def create_or_update_process(process_data, graph_id):
    node, _ = Node.objects.get_or_create(
        defaults={
            'data': {'median': '0', 'runs': '0', 'weight': '0'},
            'type': 'process',
        },
        graph_id=graph_id,
        url=process_data['url'],
    )
    if 'label' in process_data:
        node.label = process_data['label']
        node.save()

    return node


def create_or_update_run_input(run_node, input_data):
    artifact = _create_or_update_run_output_input(
        run_node,
        input_data,
        'input',
    )
    Relation.objects.get_or_create(
        source=artifact,
        target=run_node,
        type='input_to',
    )
    return artifact


def create_or_update_run_output(run_node, output_data):
    artifact = _create_or_update_run_output_input(
        run_node,
        output_data,
        'output',
    )
    Relation.objects.get_or_create(
        source=artifact,
        target=run_node,
        type='output_from',
    )
    return artifact


def _create_or_update_run_output_input(run_node, data, relation_type):
    node, _ = Node.objects.get_or_create(
        defaults={
            'data': {},
            'type': 'artifact',
        },
        graph_id=run_node.graph_id,
        url=data['url'],
    )
    node.label = data.get('label', '')
    node.save()

    Relation.objects.get_or_create(
        source=run_node,
        target=node,
        type=relation_type,
    )
    return node


def search_processes(query):
    return (
        Node.objects
        .filter(type='process')
        .filter(Q(label__contains=query) | Q(url__contains=query))
    )


def search_process_runs(query):
    return (
        Node.objects
        .filter(type='process_run')
        .filter(Q(label__contains=query) | Q(url__contains=query))
    )
