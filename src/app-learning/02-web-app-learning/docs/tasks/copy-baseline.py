import os,shutil,hashlib,json,subprocess
from pathlib import Path
base=Path.cwd(); source=base/'template'
excluded={'.local':'ローカル記録・実データ','node_modules':'再取得可能な依存キャッシュ','target':'Javaビルド生成物','playwright-report':'試験生成物','test-results':'試験生成物','.env':'秘密値を含むローカル設定'}
files=[]
for root,dirs,names in os.walk(source):
 rel=Path(root).relative_to(source)
 dirs[:]=[d for d in dirs if not (rel==Path('.') and d in excluded) and d!='.git']
 for name in names:
  r=rel/name
  if len(r.parts)==1 and name in excluded: continue
  files.append(r)
manifest={str(p).replace('\\','/'):hashlib.sha256((source/p).read_bytes()).hexdigest() for p in sorted(files)}
revision=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
for app in ['photo-diary','cast-evaluation','english-trainer','online-shop','skill-janken-game']:
 dst=base/app
 if any(dst.iterdir()): raise RuntimeError('Nonempty target: '+app)
 for rel in files:
  (dst/rel).parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source/rel,dst/rel)
 for rel,expected in manifest.items():
  assert hashlib.sha256((dst/rel).read_bytes()).hexdigest()==expected,rel
 print(app+': '+str(len(files))+' files copied and SHA256 matched')
record={'source':'template','revision':revision,'uncommitted_source_changes':subprocess.check_output(['git','status','--porcelain','--','template'],text=True),'excluded':excluded,'files':manifest,'targets':['photo-diary','cast-evaluation','english-trainer','online-shop','skill-janken-game'],'result':'全対象の固有編集前に全ファイルSHA256一致'}
(base/'docs/tasks/copy-baseline-20261027.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
