---
title: Bash Miscellaneous
tags: [miscellaneous]
created-date: 2026-10-25T20:10:47-04:00
last-updated-date: 2026-11-04T10:55:59-05:00
---

## Positional Parameters

``` bash
# ./my-script.sh foo bar baz

echo $1 # foo 
echo $2 # bar
echo $@ # foo bar baz
echo $# # 3, number of arguments
```

## System Status Variables

``` bash
$? # exit status code of the last foreground command. (0 typically means success; any other number indicates an error).
$$ # current Process ID (PID)
$! # Process ID (PID) of last background command.
```

## File Descriptor

### Use `|` to Chain Commands

`|` can be used to chain multiple command together. The prerequisite is the command after the `|` need `stdin` input to continue working.

`cat my-file.txt | grep "something"`can be chained because `grep "something"` itself will prompt for stdin input to continue.

### Redirect to File

``` bash
echo "something" > my-file.txt

# use & to indicate we are piping into a file descriptor
echo "something" > &0 # stdin
echo "something" > &1 # stdout
echo "something" > &2 # stderr
```

## Internal Field Separator (IFS)

`IFS` is a special shell variable defines the character or characters used to split strings into words or fields. Default `IFS` is ` \t\n` (space, tab, newline). When shell performs word splitting or joining or reads lines, it breaks the input wherever it encounters any of these characters.

`unset IFS` will just bring IFS back to default behavior.

## Syntax

### Subshell

``` bash
a = 1
(
  a = 2
  echo $a #2
)

echo $a # 1
```

### Command Substitution

``` bash
dir = $(pwd)
echo $dir
```

### Arithmetic Expressions

``` bash
a = 2
b = 3
c = $(( a + b )) # this evaluate the expression and put result in stdout and got captured

if (( 6 > a + b )); then
  echo "we are here" # this only evaluate and return, no stdout.
fi
```

### Process Substitution

``` bash
grep "something" file1.txt > temp1.txt
grep "something" file2.txt > temp2.txt
di

# can be done with
diff <(grep "something" file1.txt) <(grep "something" file2.txt)
# create temporary file descriptor to use for other commands
```

### Brace Expansion

``` bash
echo test.{txt,py,js} # test.txt test.py test.js

ls *.{txt,py,js} # something.txt else.py

echo {test1,test2}.{txt,py,js} # test1.txt test2.txt test1.py test2.py test1.js test2.js
```