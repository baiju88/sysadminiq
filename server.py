#!/usr/bin/env python3
import json, re, urllib.parse, urllib.request
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONTENT = ROOT / 'content.json'

DEFAULT = {'articles': [], 'scripts': [], 'commands': [], 'resources': [], 'log_map': []}

def load_content():
    if not CONTENT.exists():
        CONTENT.write_text(json.dumps(DEFAULT, indent=2), encoding='utf-8')
    try:
        data=json.loads(CONTENT.read_text(encoding='utf-8'))
    except Exception:
        data=DEFAULT.copy()
    for k,v in DEFAULT.items(): data.setdefault(k, v)
    return data

def save_content(data):
    tmp=CONTENT.with_suffix('.tmp')
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
    tmp.replace(CONTENT)

class DDGParser(HTMLParser):
    def __init__(self):
        super().__init__(); self.results=[]; self.current=None; self.in_title=False; self.in_snip=False
    def handle_starttag(self, tag, attrs):
        a=dict(attrs); cls=a.get('class',''); href=a.get('href','')
        if tag=='a' and 'result__a' in cls:
            self.current={'title':'','url':href,'snippet':''}; self.in_title=True
        elif self.current and ('result__snippet' in cls or 'result__body' in cls): self.in_snip=True
    def handle_endtag(self, tag):
        if tag=='a' and self.in_title: self.in_title=False
        if self.current and self.current.get('title') and tag=='a' and not self.in_title:
            if self.current not in self.results: self.results.append(self.current); self.current=None
        if tag in ('div','span') and self.in_snip: self.in_snip=False
    def handle_data(self,data):
        if not self.current:return
        t=' '.join(data.split())
        if self.in_title:self.current['title']+=t
        elif self.in_snip:self.current['snippet']+=t

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self): self.send_header('Cache-Control','no-store'); super().end_headers()
    def do_GET(self):
        p=urllib.parse.urlparse(self.path)
        if p.path=='/api/content': return self.send_json(load_content())
        if p.path=='/api/search': return self.search()
        if p.path=='/api/export': return self.send_json(load_content())
        return super().do_GET()
    def do_POST(self):
        p=urllib.parse.urlparse(self.path)
        if p.path=='/api/import':
            try:
                data=self.read_json(); self.validate_content(data); save_content(data); return self.send_json({'ok':True,'content':data})
            except Exception as e:return self.send_json({'ok':False,'error':str(e)},400)
        m=re.fullmatch(r'/api/(articles|scripts|commands|resources)',p.path)
        if m:return self.mutate(m.group(1),'create')
        return self.send_json({'ok':False,'error':'Not found'},404)
    def do_PUT(self):
        m=re.fullmatch(r'/api/(articles|scripts|commands|resources)/([^/]+)',urllib.parse.urlparse(self.path).path)
        if m:return self.mutate(m.group(1),'update',m.group(2))
        return self.send_json({'ok':False,'error':'Not found'},404)
    def do_DELETE(self):
        m=re.fullmatch(r'/api/(articles|scripts|commands|resources)/([^/]+)',urllib.parse.urlparse(self.path).path)
        if m:return self.mutate(m.group(1),'delete',m.group(2))
        return self.send_json({'ok':False,'error':'Not found'},404)
    def read_json(self):
        n=int(self.headers.get('Content-Length','0')); return json.loads(self.rfile.read(n).decode('utf-8'))
    def validate_content(self,d):
        if not isinstance(d,dict): raise ValueError('Backup must be a JSON object')
        for k in DEFAULT:
            if k in d and not isinstance(d[k],list): raise ValueError(f'{k} must be a list')
    def mutate(self,kind,action,item_id=None):
        try:
            data=load_content(); payload=self.read_json() if action!='delete' else {}
            arr=data[kind]
            if action=='create':
                if not payload.get('id'): payload['id']=slug(payload.get('title') or payload.get('name') or kind)
                if any(str(x.get('id'))==str(payload['id']) for x in arr): raise ValueError('An item with this ID already exists')
                arr.append(payload)
            elif action=='update':
                found=next((x for x in arr if str(x.get('id'))==str(item_id)),None)
                if not found: raise ValueError('Item not found')
                new_id=payload.get('id',item_id)
                if str(new_id)!=str(item_id) and any(str(x.get('id'))==str(new_id) for x in arr): raise ValueError('New ID already exists')
                found.clear(); found.update(payload); found['id']=new_id
            else:
                before=len(arr); data[kind]=[x for x in arr if str(x.get('id'))!=str(item_id)]
                if len(data[kind])==before: raise ValueError('Item not found')
            save_content(data); return self.send_json({'ok':True,'content':data})
        except Exception as e:return self.send_json({'ok':False,'error':str(e)},400)
    def search(self):
        params=urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query); q=params.get('q',[''])[0].strip(); scope=params.get('scope',['official'])[0]
        if not q:return self.send_json({'ok':False,'error':'Query is required'},400)
        query=f'site:knowledge.broadcom.com/external/article VMware {q}' if scope=='official' else f'VMware {q}'
        url='https://html.duckduckgo.com/html/?'+urllib.parse.urlencode({'q':query})
        req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 VMware-Troubleshooting-Assistant/2.3'})
        try:
            with urllib.request.urlopen(req,timeout=12) as r: html=r.read().decode('utf-8','ignore')
            parser=DDGParser(); parser.feed(html); results=[]
            for item in parser.results[:12]:
                raw=item['url']; parsed=urllib.parse.urlparse(raw); qs=urllib.parse.parse_qs(parsed.query)
                if 'uddg' in qs: raw=qs['uddg'][0]
                results.append({'title':item['title'] or raw,'url':raw,'snippet':item['snippet'] or 'Search result from the web.'})
            return self.send_json({'ok':True,'query':q,'engine':'DuckDuckGo','scope':scope,'results':results})
        except Exception as e:return self.send_json({'ok':False,'error':f'Internet search failed: {e}'},502)
    def send_json(self,obj,status=200):
        data=json.dumps(obj,ensure_ascii=False).encode(); self.send_response(status); self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Content-Length',str(len(data))); self.end_headers(); self.wfile.write(data)

def slug(s):
    return re.sub(r'[^a-z0-9]+','-',str(s).lower()).strip('-') or 'item'

if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser(); p.add_argument('--port',type=int,default=8080); args=p.parse_args()
    print(f'System Admin Troubleshooting Assistant v2.5 running at http://localhost:{args.port}')
    ThreadingHTTPServer(('127.0.0.1',args.port),lambda *a,**k:Handler(*a,directory=str(ROOT),**k)).serve_forever()
