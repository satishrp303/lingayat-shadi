export const communities = [
 ['Pancham / Panchamasali','पंचम / पंचमसाली'],['Jangam','जंगम'],['Banajiga / Vani','बणजिग / वाणी'],['Dixivant / Dikshavant','दीक्षिवंत / दीक्षावंत'],['Chilivant / Chilwants','चिलिवंत / चिलवंत'],['Koshti / Padmasali','कोष्टी / पद्मसाली'],['Hatkar / Bandgar','हटकर / बंडगर'],['Mali','माळी'],['Teli','तेली'],['Vanjari','वंजारी'],['Sutar','सुतार'],['Panchal','पांचाळ']
] as [string,string][];
export type Profile = {id:string;name:string;age:number;gender:string;community:string;city:string;occupation:string;education:string;marital:string;bio:string;photo?:string|null;published?:number;sample?:boolean};
export type Interest = {id:string;sender:string;recipient:string;status:string;name:string;city:string;email:string|null;profile_id:string};
export const examples: Profile[] = [
 {id:'sample-1',name:'Ananya',age:26,gender:'woman',community:'Pancham / Panchamasali',city:'Pune',occupation:'Architect',education:'Bachelor of Architecture',marital:'never',bio:'A love for thoughtful design, family time, and weekend getaways. Looking for a kind partner to share everyday joys.',sample:true},
 {id:'sample-2',name:'Aditya',age:29,gender:'man',community:'Jangam',city:'Mumbai',occupation:'Software engineer',education:'Bachelor of Engineering',marital:'never',bio:'Grounded in family values, curious about the world. Enjoys reading, hiking, and a good conversation.',sample:true},
 {id:'sample-3',name:'Shreya',age:27,gender:'woman',community:'Banajiga / Vani',city:'Solapur',occupation:'Teacher',education:'Master of Arts',marital:'never',bio:'Passionate about teaching and classical music. Hopes to build a life of mutual respect, laughter, and shared traditions.',sample:true},
];
