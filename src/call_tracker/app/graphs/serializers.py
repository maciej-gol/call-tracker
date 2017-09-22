from rest_framework import fields, serializers

from call_tracker.app.graphs.models import Graph, Node


class RaiseIfInvalidMixin(object):
    def raise_if_invalid(self):
        if not self.is_valid():
            raise serializers.ValidationError({
                'errors': self.errors,
            })


class RunSerializer(RaiseIfInvalidMixin, serializers.Serializer):
    url = serializers.URLField(required=True)
    label = serializers.CharField(required=False)
    runs_started = serializers.ListField(child=serializers.DictField(), required=False)
    process = serializers.DictField(required=False)
    outputs = serializers.ListField(child=serializers.DictField(), required=False)
    inputs = serializers.ListField(child=serializers.DictField(), required=False)


class EllipsisCharField(fields.CharField):
    def to_representation(self, value):
        value = super(EllipsisCharField, self).to_representation(value)
        if len(value) > 100:
            return '{}...'.format(value[:100])
        return value


class ProcessSerializer(serializers.ModelSerializer):
    class Meta(object):
        model = Node

    median = serializers.FloatField(source='data.median')
    runs = serializers.IntegerField(source='data.runs')
    weight = serializers.FloatField(source='data.weight')


class ArtifactSerializer(serializers.ModelSerializer):
    class Meta(object):
        model = Node

    label = EllipsisCharField()


class ProcessRunSerializer(serializers.ModelSerializer):
    class Meta(object):
        model = Node

    label = EllipsisCharField()


class ProcessWithOutputsSerializer(ProcessSerializer):
    outputs = serializers.ListField()


class GraphSerializer(RaiseIfInvalidMixin, serializers.ModelSerializer):
    class Meta(object):
        model = Graph
        fields = ('id', 'state')
