from __future__ import unicode_literals

from django.core.management.base import BaseCommand

from .handlers import create_graph_from_filename


class Command(BaseCommand):
    args = 'file'
    nodes = {}
    relations = {}

    def handle(self, file, **options):
        create_graph_from_filename(file)
