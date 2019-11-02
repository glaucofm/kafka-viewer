
import os, sys, json
from random import randrange

files = []
i = 0

for line in sys.stdin:

    filename = line.replace('\n', '')
    try:
        stats = os.stat(filename)
        if randrange(5) == 1:
            files.append({ 'name': filename, 'details': { 'size': str(stats.st_size), 'times': { 'creationTime': str(stats.st_ctime), 'modificationTime': str(stats.st_mtime) } } })
        i = i + 1
    except:
        continue

    if not randrange(100) == 1:
        continue

    try:
        message = { 'files': files }
        print json.dumps(message, sort_keys=True)
        files = []
    except:
        pass

