from django.db.models import F

from rest_framework.generics import RetrieveAPIView, ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from .handlers import (
    create_graph,
    create_or_update_run,
    list_graphs,
)
from .serializers import (
    ArtifactSerializer,
    ProcessSerializer,
    ProcessWithOutputsSerializer,
    ProcessRunSerializer,
    GraphSerializer,
    RunSerializer,
)
from call_tracker.app.graphs.models import Graph, Node, Relation
from call_tracker.app.graphs.handlers import search_processes, search_process_runs


class ListGraphView(APIView):
    def get(self, request):
        graphs = list_graphs()
        return Response(GraphSerializer(graphs, many=True).data)

    def post(self, request):
        graph = create_graph()
        return Response(GraphSerializer(graph).data)


class ListGraphRunsView(APIView):
    def patch(self, request, graph_id):
        serializer = RunSerializer(data=request.data)
        serializer.raise_if_invalid()

        create_or_update_run(graph_id, **serializer.data)
        return Response({})


class GraphArtifactsView(ListAPIView):
    queryset = Node.objects.filter(type='artifact')
    serializer_class = ArtifactSerializer

    def post(self, request, graph_id):
        nodes_ids = request.data['nodes']
        runs = Node.objects.filter(type='artifact', pk__in=nodes_ids)
        if not runs:
            return Response({})

        queryset = (
            Node.objects
            .filter(
                graph_id=graph_id,
                type__in=['process_run', 'artifact'],
            )
        )
        inputs = (
            queryset.filter(outgoing__type__in=['output', 'was_member'],
                            outgoing__target_id__in=nodes_ids)
                    .annotate(target_id=F('outgoing__target_id'))
        )
        outputs = (
            queryset.filter(outgoing__type__in=['input', 'had_member'],
                            outgoing__target_id__in=nodes_ids)
                    .annotate(target_id=F('outgoing__target_id'))
        )

        inputs_dict = {}
        for input in inputs:
            inputs_dict.setdefault(input.target_id, []).append(input)

        outputs_dict = {}
        for output in outputs:
            outputs_dict.setdefault(output.target_id, []).append(output)

        data = ArtifactSerializer(runs, many=True).data
        for run in data:
            run.update({
                'inputs': ProcessRunSerializer(inputs_dict.get(run['id'], []), many=True).data,
                'outputs': ProcessRunSerializer(outputs_dict.get(run['id'], []), many=True).data,
            })
        return Response({d['id']: d for d in data})


class GraphProcessRunsView(ListAPIView):
    queryset = Node.objects.filter(type='process_run')
    serializer_class = ProcessRunSerializer

    def filter_queryset(self, queryset):
        queryset = super(GraphProcessRunsView, self).filter_queryset(queryset)
        queryset = queryset.filter(graph_id=self.kwargs['graph_id'])

        if self.request.query_params.get('processId'):
            queryset = queryset.filter(outgoing__type='process',
                                       outgoing__target_id=self.request.query_params.get('processId'))

        if self.request.query_params.get('q'):
            return (
                search_process_runs(self.request.query_params.get('q') or '')
                .filter(id__in=queryset)
            )

        queryset = queryset.order_by('index')
        return queryset

    def post(self, request, graph_id):
        nodes_ids = request.data['nodes']
        runs = Node.objects.filter(type='process_run', pk__in=nodes_ids)
        if not runs:
            return Response({})

        queryset = (
            Node.objects
            .filter(graph_id=graph_id)
        )
        inputs = (
            queryset.filter(outgoing__type='input_to',
                            outgoing__target_id__in=nodes_ids)
                    .annotate(target_id=F('outgoing__target_id'))
        )
        outputs = (
            queryset.filter(outgoing__type='output_from',
                            outgoing__target_id__in=nodes_ids)
                    .annotate(target_id=F('outgoing__target_id'))
        )

        inputs_dict = {}
        for input in inputs:
            inputs_dict.setdefault(input.target_id, []).append(input)

        outputs_dict = {}
        for output in outputs:
            outputs_dict.setdefault(output.target_id, []).append(output)

        data = ProcessRunSerializer(runs, many=True).data
        for run in data:
            run.update({
                'inputs': ArtifactSerializer(inputs_dict.get(run['id'], []), many=True).data,
                'outputs': ArtifactSerializer(outputs_dict.get(run['id'], []), many=True).data,
            })
        return Response({d['id']: d for d in data})


class GraphProcessesView(ListAPIView):
    queryset = Node.objects.filter(type='process')
    serializer_class = ProcessSerializer

    def get_queryset(self):
        qs = super(GraphProcessesView, self).get_queryset()
        qs = qs.filter(graph_id=self.kwargs['graph_id'])
        return qs

    def filter_queryset(self, queryset):
        queryset = super(GraphProcessesView, self).filter_queryset(queryset)

        if self.request.query_params.get('q'):
            return search_processes(self.request.query_params.get('q') or '')

        return queryset


class GraphProcessView(RetrieveAPIView):
    lookup_field = 'id'
    queryset = Node.objects.filter(type='process')
    serializer_class = ProcessSerializer

    def get_queryset(self):
        qs = super(GraphProcessView, self).get_queryset()
        qs = qs.filter(graph_id=self.kwargs['graph_id'])
        return qs


class GraphProcessGraphView(ListAPIView):
    def get_queryset(self):
        sql = '''
            SELECT process.*,
                   array_remove(array_agg(other.label), NULL) as outputs
            FROM {node_table} process
            LEFT JOIN {relation_table} rel
                ON rel.source_id = process.id
                   AND rel.type = %s
            LEFT JOIN {node_table} other
                ON rel.target_id = other.id
            WHERE process.type = %s AND process.graph_id = %s
            GROUP BY process.id
            ORDER BY process.label ASC
        '''.format(node_table=Node._meta.db_table,
                   relation_table=Relation._meta.db_table)

        return (
            Node.objects
            .raw(
                sql,
                ['process_connection', 'process', int(self.kwargs['graph_id'])],
            )
        )

    def get(self, request, graph_id):
        queryset = self.get_queryset()
        processes = ProcessWithOutputsSerializer(queryset, many=True).data
        if processes:
            median = processes[0]['median']

        else:
            median = 0.0

        return Response({
            'median': median,
            'processes': processes,
        })


class GraphDetailView(RetrieveAPIView):
    lookup_url_kwarg = 'graph_id'
    queryset = Graph.objects.all()
    serializer_class = GraphSerializer
