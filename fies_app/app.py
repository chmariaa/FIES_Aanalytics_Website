# ============================================================
#  FIES Analytics Flask Backend
#  CS ELEC 01 — Computational Science | USM
# ============================================================
from flask import Flask, jsonify, render_template, request, Response
from flask_cors import CORS
import pandas as pd, numpy as np, json, os, io, csv
from functools import lru_cache

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET  = os.path.join(BASE_DIR, 'Family_Income_and_Expenditure.csv')

BINS   = [0,50000,100000,150000,200000,300000,500000,1000000,float('inf')]
LABELS = ['0-50K','50K-100K','100K-150K','150K-200K','200K-300K','300K-500K','500K-1M','1M+']
MIDS   = [25000,75000,125000,175000,250000,400000,750000,1500000]
FOCUS  = ['Total Food Expenditure','Education Expenditure','Medical Care Expenditure']
SHORT  = ['food','education','medical']

print("Loading FIES dataset...")
df = pd.read_csv(DATASET)
df = df.dropna(subset=['Total Household Income','Region']+FOCUS)
df['Bracket'] = pd.cut(df['Total Household Income'],bins=BINS,labels=LABELS)
REGIONS = sorted(df['Region'].unique())
print(f"Ready: {len(df):,} rows | {len(REGIONS)} regions")

def cdf(vals, mids):
    rates=[None]
    for i in range(1,len(vals)-1):
        h=(mids[i+1]-mids[i-1])/2
        v=vals[i+1] if not np.isnan(vals[i+1]) else vals[i]
        p=vals[i-1] if not np.isnan(vals[i-1]) else vals[i]
        rates.append(round(float((v-p)/(2*h)),6))
    rates.append(None)
    return rates

def trap(vals,mids):
    t=0.0
    for j in range(len(vals)-1):
        t+=(mids[j+1]-mids[j])/2*(vals[j]+vals[j+1])
    return round(t,2)

def build_cache():
    nat=df.groupby('Bracket',observed=True)[FOCUS].mean().round(2)
    cache={'brackets':LABELS,'midpoints':MIDS,'regions':list(REGIONS),'national':{},'regionData':{}}
    for col,s in zip(FOCUS,SHORT):
        vals=nat[col].values.tolist()
        cache['national'][s]={'avgExp':vals,'rateOfChange':cdf(nat[col].values,MIDS)}
    for reg in REGIONS:
        rdf=df[df['Region']==reg].groupby('Bracket',observed=True)[FOCUS].mean().round(2)
        hh=int((df['Region']==reg).sum())
        mi=round(float(df[df['Region']==reg]['Total Household Income'].mean()),2)
        cache['regionData'][reg]={'householdCount':hh,'meanIncome':mi,'data':{}}
        for col,s in zip(FOCUS,SHORT):
            vclean=[float(v) for v in rdf[col].dropna().values]
            mclean=MIDS[:len(vclean)]
            burden=trap(vclean,mclean)
            cache['regionData'][reg]['data'][s]={'avgExp':rdf[col].values.tolist(),'rateOfChange':cdf(rdf[col].values,MIDS),'cumulativeBurden':burden}
    fb={r:cache['regionData'][r]['data']['food']['cumulativeBurden'] for r in REGIONS}
    eb={r:cache['regionData'][r]['data']['education']['cumulativeBurden'] for r in REGIONS}
    mb={r:cache['regionData'][r]['data']['medical']['cumulativeBurden'] for r in REGIONS}
    cache['summary']={'totalHouseholds':int(len(df)),'totalRegions':len(REGIONS),'meanIncome':round(float(df['Total Household Income'].mean()),2),'minIncome':round(float(df['Total Household Income'].min()),2),'maxIncome':round(float(df['Total Household Income'].max()),2),'peakFoodRate':round(max(x for x in cache['national']['food']['rateOfChange'] if x),6),'peakEduRate':round(max(x for x in cache['national']['education']['rateOfChange'] if x),6),'peakMedRate':round(max(x for x in cache['national']['medical']['rateOfChange'] if x),6),'topFoodRegion':max(fb,key=fb.get),'topEduRegion':max(eb,key=eb.get),'topMedRegion':max(mb,key=mb.get),'lowFoodRegion':min(fb,key=fb.get)}
    return cache

CACHE = build_cache()

@app.route('/')
def index(): return render_template('index.html')

@app.route('/api/summary')
def api_summary(): return jsonify(CACHE['summary'])

@app.route('/api/national')
def api_national(): return jsonify({'brackets':CACHE['brackets'],'midpoints':CACHE['midpoints'],'national':CACHE['national']})

@app.route('/api/regions')
def api_regions(): return jsonify({'regions':CACHE['regions']})

@app.route('/api/region/<path:name>')
def api_region(name):
    if name not in CACHE['regionData']: return jsonify({'error':'Region not found'}),404
    return jsonify({'region':name,'brackets':CACHE['brackets'],'midpoints':CACHE['midpoints'],**CACHE['regionData'][name]})

@app.route('/api/burden')
def api_burden():
    cat=request.args.get('category','food')
    if cat not in SHORT: return jsonify({'error':'Use food/education/medical'}),400
    result=sorted([{'region':r,'burden':CACHE['regionData'][r]['data'][cat]['cumulativeBurden'],'burdenB':round(CACHE['regionData'][r]['data'][cat]['cumulativeBurden']/1e9,2)} for r in CACHE['regions']],key=lambda x:x['burden'],reverse=True)
    return jsonify({'category':cat,'data':result})

@app.route('/api/all_burdens')
def api_all_burdens():
    result=[]
    for r in CACHE['regions']:
        d=CACHE['regionData'][r]
        result.append({'region':r,'householdCount':d['householdCount'],'meanIncome':d['meanIncome'],'food':round(d['data']['food']['cumulativeBurden']/1e9,2),'education':round(d['data']['education']['cumulativeBurden']/1e9,2),'medical':round(d['data']['medical']['cumulativeBurden']/1e9,2)})
    return jsonify({'data':result})

@app.route('/api/cdf')
def api_cdf():
    try:
        f_prev=float(request.args.get('f_prev',0))
        f_next=float(request.args.get('f_next',0))
        h=float(request.args.get('h',1))
        if h==0: return jsonify({'error':'h cannot be zero'}),400
        rate=(f_next-f_prev)/(2*h)
        return jsonify({'f_prev':f_prev,'f_next':f_next,'h':h,'rate':round(rate,6),'numerator':f_next-f_prev,'denominator':2*h})
    except Exception as e: return jsonify({'error':str(e)}),400

@app.route('/api/trapezoidal',methods=['POST'])
def api_trapezoidal():
    try:
        body=request.get_json()
        vals=[float(v) for v in body['values']]
        mids=[float(m) for m in body['midpoints']]
        if len(vals)!=len(mids): return jsonify({'error':'Length mismatch'}),400
        if len(vals)<2: return jsonify({'error':'Need 2+ points'}),400
        total=trap(vals,mids)
        segs=[{'h':mids[j+1]-mids[j],'f_j':vals[j],'f_j1':vals[j+1],'area':round((mids[j+1]-mids[j])/2*(vals[j]+vals[j+1]),2)} for j in range(len(vals)-1)]
        return jsonify({'total':total,'segments':segs})
    except Exception as e: return jsonify({'error':str(e)}),400

@app.route('/api/export/csv')
def api_export_csv():
    si=io.StringIO(); cw=csv.writer(si)
    cw.writerow(['Region','Households','Mean Income (PHP)','Food Burden (PHP)','Education Burden (PHP)','Medical Burden (PHP)','Food (Billions)','Education (Billions)','Medical (Billions)'])
    for r in CACHE['regions']:
        d=CACHE['regionData'][r]
        cw.writerow([r,d['householdCount'],d['meanIncome'],d['data']['food']['cumulativeBurden'],d['data']['education']['cumulativeBurden'],d['data']['medical']['cumulativeBurden'],round(d['data']['food']['cumulativeBurden']/1e9,2),round(d['data']['education']['cumulativeBurden']/1e9,2),round(d['data']['medical']['cumulativeBurden']/1e9,2)])
    return Response(si.getvalue(),mimetype='text/csv',headers={'Content-Disposition':'attachment;filename=fies_burden_results.csv'})

@app.route('/api/export/rates')
def api_export_rates():
    si=io.StringIO(); cw=csv.writer(si)
    interior=LABELS[1:-1]
    cw.writerow(['Region']+[f'Food-{b}' for b in interior]+[f'Edu-{b}' for b in interior]+[f'Med-{b}' for b in interior])
    for r in CACHE['regions']:
        d=CACHE['regionData'][r]['data']
        row=[r]
        for s in SHORT: row+=[x for x in d[s]['rateOfChange'] if x is not None]
        cw.writerow(row)
    return Response(si.getvalue(),mimetype='text/csv',headers={'Content-Disposition':'attachment;filename=fies_rates_results.csv'})

@app.route('/api/health')
def api_health(): return jsonify({'status':'ok','rows':len(df),'regions':len(REGIONS)})

if __name__=='__main__':
    app.run(debug=True,port=5000)
