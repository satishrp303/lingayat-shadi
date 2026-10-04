'use client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
export function Choice({label,value,onChange,items}:{label:string;value:string;onChange:(v:string)=>void;items:[string,string][]}) {return <div className="field"><span>{label}</span><Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label}><SelectValue /></SelectTrigger><SelectContent>{items.map(([v,t])=><SelectItem key={v} value={v}>{t}</SelectItem>)}</SelectContent></Select></div>}
