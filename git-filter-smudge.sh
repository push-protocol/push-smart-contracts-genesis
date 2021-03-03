#!/bin/bash
echo $1

if [ $# -ne 1 ]; then
    echo $0: usage: myscript name
    exit 1
fi

name=$1
