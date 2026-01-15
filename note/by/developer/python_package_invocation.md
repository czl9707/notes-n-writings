---
title: Python Package Invocation
tags: [python]
created-date: 2026-01-11T12:29:15-05:00
last-updated-date: 2026-01-14T08:25:16-05:00
---

How to invoke a python package after install it using `pip`?

## Module's Main

Python module can be invoked using `python -m module.name`. This will invoke:

- the `__main__.py` if invoking a package and `__main__.py` exists.
- the module itself, and set `__name__` as `__main__`.

Most of python tooling are encouraged to invoked in this manner.

- `python -m pytest ...`
- `python -m venv ...`
- `pyhthon -m unicorn ...`

## Entrypoint

Some python package can be installed and invoked from shell directly with interfering with python.

``` bash
$ python -m pip install great-tool
$ great-tool perform task
```

To achieve this, a special directory should be defined In side `pyproject.toml`:

``` toml
[project.scripts]
my-command = "my_package.module1:obj"
another-cmd = "my_package.module2:func"
```

And when pip install the package, these commands will be add to `~/.local/bin/` which is typically part of `$PATH`. Each file will have something looks like below:

``` python
#!/usr/bin/python3.12
# -*- coding: utf-8 -*-
import re
import sys
from my_package.module1 import obj
if __name__ == '__main__':
    sys.argv[0] = re.sub(r'(-script\.pyw|\.exe)?$', '', sys.argv[0])
    sys.exit(obj())
```

The script wrapper has a shebang `#!/user/bin/python3.12` which reference the interpreter used to install the package.