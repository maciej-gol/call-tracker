# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import django.contrib.postgres.fields.hstore


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Graph',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('state', models.CharField(max_length=64)),
                ('source_file', models.FileField(upload_to=b'graphs/%Y/%m/%d', blank=True)),
                ('source_file_url', models.URLField(max_length=256)),
            ],
        ),
        migrations.CreateModel(
            name='Node',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('url', models.TextField(db_index=True)),
                ('label', models.TextField()),
                ('type', models.CharField(max_length=32, db_index=True)),
                ('index', models.IntegerField(null=True, blank=True)),
                ('data', django.contrib.postgres.fields.hstore.HStoreField(default={})),
                ('graph', models.ForeignKey(to='graphs.Graph', null=True)),
            ],
            options={
                'ordering': ['label'],
            },
        ),
        migrations.CreateModel(
            name='Relation',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('type', models.CharField(max_length=32, db_index=True)),
                ('data', django.contrib.postgres.fields.hstore.HStoreField(default={})),
                ('source', models.ForeignKey(related_name='outgoing', to='graphs.Node')),
                ('target', models.ForeignKey(related_name='incoming', to='graphs.Node')),
            ],
        ),
        migrations.AlterUniqueTogether(
            name='relation',
            unique_together=set([('source', 'target', 'type')]),
        ),
        migrations.AlterUniqueTogether(
            name='node',
            unique_together=set([('graph', 'url')]),
        ),
        migrations.AlterIndexTogether(
            name='node',
            index_together=set([('graph', 'type')]),
        ),
    ]
