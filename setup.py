from setuptools import setup, find_packages

install_requires = [l.strip() for l in open('requirements.txt').readlines()]
setup(
    name='call_tracker',
    version='1.0',
    author='Maciej Gol',
    author_email='1kroolik1@gmail.com',
    url='https://github.com/maciej-gol/call-tracker',
    description='Call tracking and visualizing tool.',
    package_dir={'': 'src'},
    packages=find_packages(''),
    license='MIT',
    include_package_data=True,
    entry_points={
        'console_scripts': [
            'call_tracker = call_tracker.cli:main',
        ],
    },
    install_requires=install_requires,
    classifiers=[
        'Framework :: Django',
        'Intended Audience :: Developers',
        'Intended Audience :: System Administrators',
        'Operating System :: POSIX :: Linux',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.6',
        'Programming Language :: Python :: 3 :: Only',
        'Topic :: Software Development'
    ],
)
