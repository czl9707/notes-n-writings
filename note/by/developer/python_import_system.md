---
title: Python Import System
tags: [python]
created-date: 2025-10-21T23:04:45-04:00
last-updated-date: 2025-10-23T22:55:10-04:00
---

There are multiple ways of import modules in python.

- `import pkg`
- `from pkg import *`
- `__import__("pkg")`
- `importlib.import_module()`

From the caller's aspect, importing is executing the module code in a scope and bind the scope (or its contents) to one or more variables.

```
pkg = object()
exec(pkg_code, pkg.__dict__)
```

## `sys.path`

When learning about python import system, the first thing to know is that Python only looks for package within paths in `sys.path`. Printing out the `sys.path`:

``` python 
[
	'', 
	'/path/to/python-dir/cpython-3.13.3-linux-x86_64-gnu/lib/python313.zip', 
	'/path/to/python-dir/cpython-3.13.3-linux-x86_64-gnu/lib/python3.13', 
	'/path/to/python-dir/cpython-3.13.3-linux-x86_64-gnu/lib/python3.13/lib-dynload',
	'/path/to/python-dir/cpython-3.13.3-linux-x86_64-gnu/lib/python3.13/site-packages'
]
```

It includes various paths inside where the interpreter located and `pwd`.

Knowing this is more than sufficient for writing python applications. Manipulating `sys.path` will allow importing packages from paths other than ones above. The default python import system only behaves little bit beyond that.

## Finder

Python import system is modular and extendable. The package resolution process is literally calling those defined `finder` one by one until one finder can locate the package.

All `finder`s are registered inside `sys.meta_path`, python provides three default importer, supporting most of daily usage.

``` python
>>> sys.meta_path
[
	<class '_frozen_importlib.BuiltinImporter'>, 
	<class '_frozen_importlib.FrozenImporter'>, 
	<class '_frozen_importlib_external.PathFinder'>
]
```

- `BuiltinImporter` is used for built-in modules.
- `FrozenImporter` for frozen modules, essentially modules that not ending in `.py`.
- `PathFinder` for path based importing.

A finder object has `find_spec()` defined, which return the origin and loader if the module is found.

``` python
>>> sys.meta_path[0].find_spec("sys")
ModuleSpec(name='sys', loader=<class '_frozen_importlib.BuiltinImporter'>, origin='built-in')
>>>
>>> sys.meta_path[2].find_spec("pathlib")
ModuleSpec(name='pathlib', loader=<_frozen_importlib_external.SourceFileLoader object at 0x71bb43c01790>, origin='/path/to/python-dir/cpython-3.13.3-linux-x86_64-gnu/lib/python3.13/pathlib/__init__.py', submodule_search_locations=['/path/to/python-dir/cpython-3.13.3-linux-x86_64-gnu/lib/python3.13/pathlib'])
>>>
>>> print(sys.meta_path[0].find_spec("pathlib"))
None
```

If the module cannot be found by any of finder, a `ImportError` will be thrown.

## Loader

A loader object has `exec_spec()` defined, which is used to execute the module found by finder. In a lot of cases, loader and finder can the same object, in the previous example, `BuiltinImporter` is both finder and loader.

The module loading process contains several stages:

- Create the `Module` object.
	- Call `loader.create_module(spec)` if defined.
- Add the `Module` to `sys.modules`.
	- Do nothing if it is a [Namespace Package](#Regular%20Package%20&%20Namespace%20Package).
	- Call `loader.exec_module(spec)` or `loader.load_module(spec)` if any defined, .
	- `exec_module` would exec the code inside the module
- Remove the `Module` from `sys.modules` if any Error bubbled up from any steps above, and raise `ImportError`.

The spec information of imported module will be preserved as `__spec__` attribute on the module object.

``` python
>>> sys.__spec__
ModuleSpec(name='sys', loader=<class '_frozen_importlib.BuiltinImporter'>, origin='built-in')
```

## `sys.modules`

Module will be cached after imported successfully for the first time. Later importing will reuse the module object from `sys.modules`.

Deleting module from `sys.modules` will effectively disable the import cache, but other module that already imported the module will hold the reference, which will create some issue, when two version of module co-exist, even if the code is completely the same.

To reload the module, `importlib.reload()` will be a better choice, which would reuse the same module object, and simply reinitialize the content.

## Regular Package & Namespace Package

Regular packages has a `__init__.py` defined, while Namespace Package do not.

``` bash
srcA/
│
└── pkgA/  # namespace package
    └── module1.py 
srcB/
├── pkgA/  # namespace package
│	└── module2.py
└── pkgB/  # regular package
	└── __init__.py
```

Regular Package has a single import source, while namespace package allow contents to be span across different places, or distributed across different packages. In a enterprise context, it is better for teams to share same top-level package.

## `__main__`

`__main__` is a special module directly initialized on interpreter start, the `__main__` module will have `__spec__` set as `None`. One exception is when running python with `-m` option, then `__spec__` is populated with the spec of target module.