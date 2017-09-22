from django.contrib.postgres.fields import HStoreField
from django.db import models


class Graph(models.Model):
    class State(object):
        INITIALIZING = 'initializing'
        DONE = 'done'
        ERROR = 'error'

    state = models.CharField(max_length=64)
    source_file = models.FileField(blank=True, upload_to='graphs/%Y/%m/%d')
    source_file_url = models.URLField(max_length=256)


class Node(models.Model):
    class Meta(object):
        ordering = ['label']
        index_together = [('graph', 'type')]
        unique_together = [('graph', 'url')]

    graph = models.ForeignKey(Graph, null=True)
    url = models.TextField(db_index=True)
    label = models.TextField()
    type = models.CharField(max_length=32, db_index=True)
    index = models.IntegerField(null=True, blank=True)
    data = HStoreField(default={})


class Relation(models.Model):
    class Meta(object):
        unique_together = [('source', 'target', 'type')]

    source = models.ForeignKey(Node, related_name='outgoing')
    target = models.ForeignKey(Node, related_name='incoming')
    type = models.CharField(max_length=32, db_index=True)
    data = HStoreField(default={})

    def __unicode__(self):
        return u'{} -[:{}]-> {}'.format(
            self.source.label,
            self.type,
            self.target.label,
        )
