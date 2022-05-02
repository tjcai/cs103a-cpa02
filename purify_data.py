import json
import os
with open('./public/data/top_5000_mydramalist.json') as d:
    data = json.load(d)
    for item in data:
        item['region_origin'] = item.pop('country_origin')

print(data[0]['region_origin'])

with open('./public/data/top_5000_mydramalist_purified.json', 'w') as d:
    json.dump(data, d, indent=4)
d.close()