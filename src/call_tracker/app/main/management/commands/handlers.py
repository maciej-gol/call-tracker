import logging
import time

from main.handlers import create_graph_from_path
from main.models import Graph

log = logging.getLogger(__name__)


def create_graph_from_filename(filename):
    graph = create_graph_from_path(filename)
    state = Graph.State.INITIALIZING

    log.info('Initializing graph %d', graph.id)

    # This is done outside of transaction management.
    while state == Graph.State.INITIALIZING:
        time.sleep(1)
        state = (
            Graph.objects
            .filter(id=graph.id)
            .values_list('state', flat=True)
            .first()
        )

    log.info('Initializing finished. State: %s', state)
    return Graph.objects.get(id=graph.id)
