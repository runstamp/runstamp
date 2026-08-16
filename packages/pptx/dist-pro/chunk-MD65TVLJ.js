import { createRequire as __runstampCreateRequire } from "node:module";
const require = __runstampCreateRequire(import.meta.url);
import{a as St,c as Jt}from"./chunk-QZJ4PXPW.js";import{a as It,b as Oe,c as Se,d as tt,e as Vr,f as ke,g as Rt,h as Ae}from"./chunk-FJO754UF.js";import{l as Ir,o as Kt,s as Ur}from"./chunk-TOQ3LOE6.js";import{a as Fr,b as jt,d as Je,e as Wt}from"./chunk-T4GWOACP.js";import{a as E,b as I,e as ie,f as y,h as O,i as se,j as Br,k as wt,m as Dr,n as Nr,o as _r,p as zr,q as Xr}from"./chunk-3HORQEKB.js";import{q as Lr}from"./chunk-THCVVEX5.js";import{a as Rr}from"./chunk-TDABGID4.js";import{b as Tr,c as et}from"./chunk-R7PVEMNZ.js";import{c as Mr,d as Er}from"./chunk-LHKQSUXG.js";import{c as Ue,e as ae}from"./chunk-XBO3ORGP.js";import{a as Ar}from"./chunk-ADWVZHRZ.js";import{c as Qe}from"./chunk-ML3X2D76.js";import{a as wr,b as Fe}from"./chunk-ELPCWJB2.js";import{d as Ce,e as ft,f as qt,h as Ze,j as He,k as kr,l as Ct,m as Yt}from"./chunk-Z342JLOB.js";import{e as ee}from"./chunk-F6KKPX27.js";import{a as Q,b as Sr}from"./chunk-5ZNH2XG2.js";import{d as Cr}from"./chunk-QX5PMXDJ.js";function Zt(e){let t=fa(e);if(t)return{platform:"youtube",videoId:t,embedUrl:`https://www.youtube.com/embed/${t}`,watchUrl:`https://www.youtube.com/watch?v=${t}`,posterUrl:`https://img.youtube.com/vi/${t}/hqdefault.jpg`};let r=ha(e);return r?{platform:"vimeo",videoId:r,embedUrl:`https://player.vimeo.com/video/${r}`,watchUrl:`https://vimeo.com/${r}`,posterUrl:""}:null}function qs(e){return Zt(e)!==null}function fa(e){let t;try{t=new URL(e)}catch{return null}let r=t.hostname.replace(/^www\./,"").replace(/^m\./,"");if(r==="youtube.com"||r==="youtube-nocookie.com"){if(t.pathname==="/watch"){let o=t.searchParams.get("v");return o&&Or(o)?o:null}let n=/^\/embed\/([a-zA-Z0-9_-]{11})/.exec(t.pathname);if(n)return n[1]}if(r==="youtu.be"){let n=t.pathname.slice(1).split("/")[0];return n&&Or(n)?n:null}return null}function ha(e){let t;try{t=new URL(e)}catch{return null}let r=t.hostname.replace(/^www\./,"");if(r==="vimeo.com"){let n=/^\/(\d{6,})/.exec(t.pathname);return n?n[1]:null}if(r==="player.vimeo.com"){let n=/^\/video\/(\d{6,})/.exec(t.pathname);return n?n[1]:null}return null}function Or(e){return/^[a-zA-Z0-9_-]{11}$/.test(e)}import{createHash as ua}from"node:crypto";function Qt(e,t,r={}){if(!(r.skipHidden&&e.style?.display==="none")){t(e);for(let n of e.children??[])Qt(n,t,r)}}function je(e,t,r={}){let n=[];return Qt(e,o=>{t(o)&&n.push(o)},r),n}function Ks(e,t,r={}){let n=!1;return Qt(e,o=>{!n&&t(o)&&(n=!0)},r),n}function Pe(e){try{let t=new URL(e);return`${t.protocol}//${t.host}${t.pathname}`}catch{return e.slice(0,100)}}function ga(e=kr){return{limitBytes:e,consumedBytes:0,reservedBytes:0}}function xa(e){return ua("sha256").update(e).digest("hex")}function ya(e){return je(e,t=>t.type==="Image",{skipHidden:!0})}function va(e){return je(e,t=>{if(t.type!=="View"&&t.type!=="Slide"||!t.style?.fill)return!1;let r=t.style.fill;return r.type==="image"&&!!r.src},{skipHidden:!0})}function Pa(e){return je(e,t=>t.type==="Video",{skipHidden:!0})}function $a(e){return je(e,t=>t.type==="Audio",{skipHidden:!0})}function Ft(e){switch(e){case"video/mp4":return"mp4";case"video/webm":return"webm";case"video/x-msvideo":case"video/avi":return"avi";case"video/quicktime":return"mov";case"video/x-ms-wmv":return"wmv";default:return"mp4"}}function kt(e){switch(e){case"audio/mpeg":case"audio/mp3":return"mp3";case"audio/wav":case"audio/x-wav":return"wav";case"audio/ogg":return"ogg";case"audio/mp4":case"audio/x-m4a":return"m4a";case"audio/x-ms-wma":return"wma";default:return"mp3"}}function Wr(e){try{let r=new URL(e).pathname.split(".").pop()?.toLowerCase()??"";return["mp4","webm","avi","mov","wmv"].includes(r)?r:"mp4"}catch{return"mp4"}}function qr(e){try{let r=new URL(e).pathname.split(".").pop()?.toLowerCase()??"";return["mp3","wav","ogg","m4a","wma"].includes(r)?r:"mp3"}catch{return"mp3"}}function Yr(e){switch(e){case"image/jpeg":case"image/jpg":return"jpg";case"image/png":return"png";case"image/gif":return"gif";case"image/webp":return"webp";case"image/svg+xml":return"svg";case"image/tiff":return"tiff";case"image/bmp":case"image/x-ms-bmp":return"bmp";default:return"png"}}function ba(e){try{let r=new URL(e).pathname.split(".").pop()?.toLowerCase()??"";return r==="jpeg"?"jpg":["jpg","png","gif","webp","svg"].includes(r)?r:"png"}catch{return"png"}}function Ca(e,t,r){e.length===0&&t.length>0&&ee().warn(`[media] Corrupt base64 data in data URL (MIME: ${r}) \u2014 decoded to empty buffer`)}function Sa(e){if(e.length<4||e[0]!==255||e[1]!==216)return;let t=new Set([192,193,194,195,197,198,199,201,202,203,205,206,207]),r=2;for(;r+3<e.length;){for(;r<e.length&&e[r]===255;)r+=1;if(r>=e.length)break;let n=e[r++];if(n===216||n===217||n>=208&&n<=215)continue;if(r+1>=e.length)break;let o=e.readUInt16BE(r);if(o<2||r+o>e.length)break;if(t.has(n)&&o>=7)return{height:e.readUInt16BE(r+3),width:e.readUInt16BE(r+5)};r+=o}}function wa(e){if(e.length>=24&&e.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&e.subarray(12,16).toString("ascii")==="IHDR")return{width:e.readUInt32BE(16),height:e.readUInt32BE(20)};if(e.length>=10&&/^GIF8[79]a$/u.test(e.subarray(0,6).toString("ascii")))return{width:e.readUInt16LE(6),height:e.readUInt16LE(8)};if(e.length>=26&&e.subarray(0,2).toString("ascii")==="BM")return e.readUInt32LE(14)===12?{width:e.readUInt16LE(18),height:e.readUInt16LE(20)}:{width:Math.abs(e.readInt32LE(18)),height:Math.abs(e.readInt32LE(22))};if(e.length>=30&&e.subarray(0,4).toString("ascii")==="RIFF"&&e.subarray(8,12).toString("ascii")==="WEBP"){let t=e.subarray(12,16).toString("ascii");if(t==="VP8X")return{width:1+e.readUIntLE(24,3),height:1+e.readUIntLE(27,3)};if(t==="VP8 "&&e.subarray(23,26).equals(Buffer.from([157,1,42])))return{width:e.readUInt16LE(26)&16383,height:e.readUInt16LE(28)&16383};if(t==="VP8L"&&e[20]===47)return{width:1+e[21]+((e[22]&63)<<8),height:1+(e[22]>>6)+(e[23]<<2)+((e[24]&15)<<10)}}return Sa(e)}function Kr(e){let t=wa(e);if(t&&(t.width>Ct||t.height>Ct))throw new Q(`Raster image dimensions ${t.width}x${t.height}px exceed the ${Ct}px per-side limit`,{code:"RESOURCE_LIMIT_EXCEEDED",phase:"media"})}function er(e,t){let r=e.indexOf(",");if(r===-1)return ee().warn(`[media] Malformed ${t.mediaKind} data URL: missing comma separator`),{buffer:Buffer.alloc(0),ext:t.defaultExt};let n=e.slice(0,r),o=e.slice(r+1);Yt(o);let a=n.split(";")[0].slice(5),i=Buffer.from(o,"base64");return Ca(i,o,a),t.mediaKind==="image"&&Kr(i),{buffer:i,ext:t.extensionFromMime(a)}}function Jr(e){return er(e,{mediaKind:"image",defaultExt:"png",extensionFromMime:Yr})}function Ia(e){return er(e,{mediaKind:"video",defaultExt:"mp4",extensionFromMime:Ft})}function Ra(e){return er(e,{mediaKind:"audio",defaultExt:"mp3",extensionFromMime:kt})}function Zr(e,t,r){return new Q(`Aggregate fetched media too large: ${(r/1024/1024).toFixed(1)} MB exceeds ${e.limitBytes/1024/1024} MB aggregate limit: ${Pe(t)}`,{code:"RESOURCE_LIMIT_EXCEEDED",phase:"media"})}function Fa(e,t,r){let n=e.consumedBytes+e.reservedBytes+t;if(n>e.limitBytes)throw Zr(e,r,n);e.reservedBytes+=t}function ka(e,t,r){return e.reservedBytes-=t,e.consumedBytes+=r,e.consumedBytes+e.reservedBytes}function rt(e){if(e instanceof Q&&e.code==="RESOURCE_LIMIT_EXCEEDED")throw e}async function ut(e,t,r=He,n){let o=e.headers.get("content-length"),a=o===null?void 0:Number.parseInt(o,10),i=a!==void 0&&Number.isFinite(a)&&a>=0?a:void 0;if(i!==void 0&&i>r)throw new Q(`Media file too large: ${(i/1024/1024).toFixed(1)} MB exceeds ${r/1024/1024} MB limit: ${Pe(t)}`,{code:"RESOURCE_LIMIT_EXCEEDED",phase:"media"});let s=0;n&&i!==void 0&&(Fa(n,i,t),s=i);let l;try{l=await e.arrayBuffer()}catch(m){throw n&&(n.reservedBytes-=s),m instanceof Q?m:new Q(`[media] Failed to read media response body: ${Pe(t)}`,{code:"MEDIA_FETCH_FAILED",phase:"media",cause:m})}let p=n?ka(n,s,l.byteLength):void 0;if(l.byteLength>r)throw new Q(`Media file too large: ${(l.byteLength/1024/1024).toFixed(1)} MB exceeds ${r/1024/1024} MB limit: ${Pe(t)}`,{code:"RESOURCE_LIMIT_EXCEEDED",phase:"media"});if(n&&p!==void 0&&p>n.limitBytes)throw Zr(n,t,p);return l}async function Gr(e,t,r){return Qr(e,{context:r,mediaFetchBudget:t})}async function Qr(e,t={}){if(e.startsWith("data:"))return Jr(e);await(t.validateUrl??Qe)(e);let r=await et(e,{signal:t.signal??AbortSignal.timeout(Ze)});if(!r.ok){let s=t.context?` (slide ${t.context.slideIndex}, ${t.context.nodeType})`:"";throw new Q(`[media] Failed to fetch image \u2014 HTTP ${r.status}${s}: ${Pe(e)}`,{code:"MEDIA_FETCH_FAILED",phase:"media"})}let o=(r.headers.get("content-type")??"image/png").split(";")[0].trim(),a=await ut(r,e,He,t.mediaFetchBudget),i=Buffer.from(a);return Kr(i),{buffer:i,ext:Yr(o)||ba(e)}}async function Aa(e,t,r){await Qe(e);let n=await et(e,{signal:AbortSignal.timeout(Ze)});if(!n.ok){let s=r?` (slide ${r.slideIndex}, ${r.nodeType})`:"";throw new Q(`[media] Failed to fetch video \u2014 HTTP ${n.status}${s}: ${Pe(e)}`,{code:"MEDIA_FETCH_FAILED",phase:"media"})}let a=(n.headers.get("content-type")??"video/mp4").split(";")[0].trim(),i=await ut(n,e,He,t);return{buffer:Buffer.from(i),ext:Ft(a)||Wr(e)}}async function La(e,t,r){await Qe(e);let n=await et(e,{signal:AbortSignal.timeout(Ze)});if(!n.ok){let s=r?` (slide ${r.slideIndex}, ${r.nodeType})`:"";throw new Q(`[media] Failed to fetch audio \u2014 HTTP ${n.status}${s}: ${Pe(e)}`,{code:"MEDIA_FETCH_FAILED",phase:"media"})}let a=(n.headers.get("content-type")??"audio/mpeg").split(";")[0].trim(),i=await ut(n,e,He,t);return{buffer:Buffer.from(i),ext:kt(a)||qr(e)}}var Ta=6;async function ht(e,t,r=Ta){let n=new Array(e.length),o=0;async function a(){for(;o<e.length;){let s=o++;n[s]=await t(e[s],s)}}let i=Array.from({length:Math.min(r,e.length)},()=>a());return await Promise.all(i),n}async function Hr(e,t){return Qr(e,{mediaFetchBudget:t})}function jr(e,t,r){let{buffer:n,ext:o}=e,a,i;if(r){let s=xa(n),l=r.get(s);if(l)return{buffer:l.buffer,ext:l.ext,mediaPath:l.mediaPath,relativePath:l.relativePath};let m=`image${t.current++}.${o}`;a=`ppt/media/${m}`,i=`../media/${m}`,r.set(s,{mediaPath:a,relativePath:i,ext:o,buffer:n})}else{let l=`image${t.current++}.${o}`;a=`ppt/media/${l}`,i=`../media/${l}`}return{buffer:n,ext:o,mediaPath:a,relativePath:i}}async function lo(e,t,r={current:1},n,o=ga()){let a=ya(e),i=[],s=2,l=a.map(k=>k.src),p=await ht(l,k=>Hr(k,o)),m=[];for(let k of p){let x=jr(k,t,n);m.push({rId:`rId${s++}`,mediaPath:x.mediaPath,relativePath:x.relativePath,ext:x.ext,buffer:x.buffer})}let f=va(e).map(k=>k.style.fill.src),d=await ht(f,k=>Hr(k,o)),$=[];for(let k of d){let x=jr(k,t,n);$.push({rId:`rId${s++}`,mediaPath:x.mediaPath,relativePath:x.relativePath,ext:x.ext,buffer:x.buffer})}let g=Pa(e),F=await ht(g,async k=>{let x=k,v=x.src,b=x.mimeType,M=Zt(v);if(M){if(!Ir("web-video-embedding",wr()))throw new Sr("YouTube/Vimeo video embedding is not bundled in the lite build. Use a direct video URL (MP4), or import the full engine entry.","web-video-embedding");let z=M.posterUrl;if(M.platform==="vimeo"&&!z)try{let j=`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(M.watchUrl)}`;await Qe(j);let J=await et(j,{signal:AbortSignal.timeout(Ze)}),S=await ut(J,j,He,o);z=JSON.parse(Buffer.from(S).toString("utf-8")).thumbnail_url??""}catch(j){rt(j),ee().warn(`[media] Vimeo oEmbed fetch failed: ${j.message}`)}let W=null;if(z)try{W=await Gr(z,o)}catch(j){rt(j),ee().warn(`[media] Web video poster fetch failed: ${j.message}`),W={buffer:Buffer.alloc(0),ext:"jpg"}}return{buffer:Buffer.alloc(0),ext:"mp4",poster:W,webVideoInfo:M}}let _,q;try{v.startsWith("data:")?{buffer:_,ext:q}=Ia(v):{buffer:_,ext:q}=await Aa(v,o)}catch(z){rt(z);let W=`Video fetch failed for "${Pe(v)}": ${z.message}. Using empty buffer.`;ee().warn(`[media] ${W}`),i.push(W),_=Buffer.alloc(0),q=b?Ft(b):Wr(v)}b&&(q=Ft(b));let w=null;if(x.poster)try{x.poster.startsWith("data:")?w=Jr(x.poster):w=await Gr(x.poster,o)}catch(z){rt(z);let W=`Poster image fetch failed for "${Pe(x.poster)}": ${z.message}. Using empty buffer.`;ee().warn(`[media] ${W}`),i.push(W),w={buffer:Buffer.alloc(0),ext:"png"}}return{buffer:_,ext:q,poster:w,webVideoInfo:void 0}}),P=[];for(let k=0;k<g.length;k++){let{buffer:x,ext:v,poster:b,webVideoInfo:M}=F[k];if(M){let _={videoRId:"",mediaRId:"",mediaPath:"",relativePath:"",ext:"mp4",buffer:Buffer.alloc(0),webVideo:{embedUrl:M.embedUrl,watchUrl:M.watchUrl,hyperlinkRId:`rId${s++}`}};if(b){let w=`image${t.current++}.${b.ext}`;_.posterRId=`rId${s++}`,_.posterMediaPath=`ppt/media/${w}`,_.posterRelativePath=`../media/${w}`,_.posterExt=b.ext,_.posterBuffer=b.buffer}P.push(_)}else{let q=`video${r.current++}.${v}`,w=`rId${s++}`,z=`rId${s++}`,W={videoRId:w,mediaRId:z,mediaPath:`ppt/media/${q}`,relativePath:`../media/${q}`,ext:v,buffer:x};if(b){let J=`image${t.current++}.${b.ext}`,S=`rId${s++}`;W.posterRId=S,W.posterMediaPath=`ppt/media/${J}`,W.posterRelativePath=`../media/${J}`,W.posterExt=b.ext,W.posterBuffer=b.buffer}P.push(W)}}let u=$a(e),X=await ht(u,async k=>{let x=k,v=x.src,b=x.mimeType,M,_;try{v.startsWith("data:")?{buffer:M,ext:_}=Ra(v):{buffer:M,ext:_}=await La(v,o)}catch(q){rt(q);let w=`Audio fetch failed for "${Pe(v)}": ${q.message}. Using empty buffer.`;ee().warn(`[media] ${w}`),i.push(w),M=Buffer.alloc(0),_=b?kt(b):qr(v)}return b&&(_=kt(b)),{buffer:M,ext:_}}),D=[];for(let{buffer:k,ext:x}of X){let b=`audio${r.current++}.${x}`,M=`rId${s++}`,_=`rId${s++}`;D.push({audioRId:M,mediaRId:_,mediaPath:`ppt/media/${b}`,relativePath:`../media/${b}`,ext:x,buffer:k})}let A=a.filter(k=>k.svgSrc),T=await ht(A,async k=>{let x=k.svgSrc;if(x.startsWith("data:")){let v=x.indexOf(","),b=x.slice(0,v),M=x.slice(v+1);if(b.includes("base64"))return Yt(M),{buffer:Buffer.from(M,"base64"),ok:!0};if(M.length>50*1024*1024)throw new Q(`SVG data URL exceeds maximum size limit (${(M.length/1024/1024).toFixed(1)} MB)`,{code:"RESOURCE_LIMIT_EXCEEDED",phase:"media"});return{buffer:Buffer.from(decodeURIComponent(M),"utf-8"),ok:!0}}try{await Qe(x);let v=await et(x,{signal:AbortSignal.timeout(Ze)});if(!v.ok)throw new Q(`HTTP ${v.status}`,{code:"MEDIA_FETCH_FAILED",phase:"media"});let b=await ut(v,x,He,o);return{buffer:Buffer.from(b),ok:!0}}catch(v){rt(v);let b=`SVG fetch failed for "${Pe(x)}": ${v.message}. Skipping SVG.`;return ee().warn(`[media] ${b}`),i.push(b),{buffer:Buffer.alloc(0),ok:!1}}}),G=[];for(let k=0;k<T.length;k++){let x=T[k];if(!x.ok)continue;let b=`image${t.current++}.svg`,M=`rId${s++}`;G.push({svgRId:M,svgMediaPath:`ppt/media/${b}`,svgRelativePath:`../media/${b}`,svgBuffer:x.buffer})}return{assets:m,fillAssets:$,videoAssets:P,audioAssets:D,svgAssets:G,warnings:i}}var Rn=Cr(Rr(),1);var Ma="http://schemas.openxmlformats.org/package/2006/content-types",Ea="http://schemas.openxmlformats.org/package/2006/relationships";function Ba(e){return e.replace(/^\./,"").toLowerCase()}function At(e){return e.replace(/^\/+/,"")}function tn(e){return`/${At(e)}`}function Da(e){let t=e.slice(e.lastIndexOf("/")+1),r=t.lastIndexOf(".");return r===-1?void 0:t.slice(r+1).toLowerCase()}var Lt=class{defaults=new Map;overrides=new Map;relationships=new Map;addDefault(t,r){let n=Ba(t),o=this.defaults.get(n);if(o&&o!==r)throw new Q(`Conflicting content type defaults for extension "${n}".`,{code:"STRUCTURAL_VALIDATION_FAILED",phase:"serialization"});this.defaults.set(n,r)}addPart(t,r){let n=tn(t),o=this.overrides.get(n);if(o&&o!==r)throw new Q(`Conflicting content type overrides for part "${n}".`,{code:"STRUCTURAL_VALIDATION_FAILED",phase:"serialization"});this.overrides.set(n,r)}addRelationship(t,r){let n=t?At(t):"",o=this.relationships.get(n)??new Map;if(o.has(r.id))throw new Q(`Duplicate relationship id "${r.id}" for "${n||"/"}".`,{code:"STRUCTURAL_VALIDATION_FAILED",phase:"serialization"});o.set(r.id,r),this.relationships.set(n,o)}generateContentTypesXml(){let t=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;t+=`<Types xmlns="${Ma}">`;for(let[r,n]of this.defaults)t+=`<Default Extension="${I(r)}" ContentType="${I(n)}"/>`;for(let[r,n]of this.overrides)t+=`<Override PartName="${I(r)}" ContentType="${I(n)}"/>`;return t+="</Types>",t}generateRelationshipsXml(t){let r=t?At(t):"",n=[...this.relationships.get(r)?.values()??[]];return re(n)}};function re(e){let t=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;t+=`<Relationships xmlns="${Ea}">
`;for(let r of e){let n=r.targetMode?` TargetMode="${I(r.targetMode)}"`:"";t+=`  <Relationship Id="${I(r.id)}" Type="${I(r.type)}" Target="${I(r.target)}"${n}/>
`}return t+="</Relationships>",t}function gt(e,t){return new RegExp(`\\b${t}="([^"]*)"`).exec(e)?.[1]}function Na(e,t){if(t.startsWith("/"))return At(t);let n=e.substring(0,e.lastIndexOf("/")+1).replace(/_rels\/$/,""),o=[];for(let a of`${n}${t}`.split("/"))a===".."?o.pop():a!=="."&&a!==""&&o.push(a);return o.join("/")}function _a(e){let t=[],r=new Set,n=new Set;for(let o of e.matchAll(/<Default\b[^>]*>/g)){let a=gt(o[0],"Extension")?.toLowerCase();a&&(r.has(a)&&t.push(`Duplicate content type default for extension "${a}".`),r.add(a))}for(let o of e.matchAll(/<Override\b[^>]*>/g)){let a=gt(o[0],"PartName")?.toLowerCase();a&&(n.has(a)&&t.push(`Duplicate content type override for part "${a}".`),n.add(a))}return{diagnostics:t,defaults:r,overrides:n}}async function en(e,t){return await e.file(t).async("string")}async function rn(e){let t=Object.keys(e.files).filter(s=>!e.files[s].dir).sort(),r=new Set(t),n=[];r.has("[Content_Types].xml")||n.push("Package is missing [Content_Types].xml.");let o=r.has("[Content_Types].xml")?await en(e,"[Content_Types].xml"):"",a=_a(o);n.push(...a.diagnostics);for(let s of t){if(s==="[Content_Types].xml")continue;let l=Da(s),p=a.overrides.has(tn(s).toLowerCase()),m=l?a.defaults.has(l):!1;!p&&!m&&n.push(`Package part "${s}" has no content type default or override.`)}let i=t.filter(s=>s.endsWith(".rels"));for(let s of i){let l=await en(e,s),p=new Set;for(let m of l.matchAll(/<Relationship\b[^>]*>/g)){let c=m[0],f=gt(c,"Id"),d=gt(c,"Target"),$=gt(c,"TargetMode");if(!f||!d||(p.has(f)&&n.push(`Duplicate relationship id "${f}" in "${s}".`),p.add(f),$==="External"))continue;let g=Na(s,d);r.has(g)||n.push(`Relationship "${f}" in "${s}" points to missing target "${g}".`)}}if(n.length>0){let s=n.map((l,p)=>({path:`packageManifest.${p}`,message:l}));throw new Q(`PPTX package manifest invariant check failed with ${n.length} issue(s).`,{code:"STRUCTURAL_VALIDATION_FAILED",phase:"serialization",issues:s})}}var N={rels:"application/vnd.openxmlformats-package.relationships+xml",xml:"application/xml",png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",gif:"image/gif",webp:"image/webp",tiff:"image/tiff",bmp:"image/bmp",svg:"image/svg+xml",mp4:"video/mp4",webm:"video/webm",avi:"video/x-msvideo",mov:"video/quicktime",wmv:"video/x-ms-wmv",mp3:"audio/mpeg",wav:"audio/wav",ogg:"audio/ogg",m4a:"audio/mp4",wma:"audio/x-ms-wma",xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",fntdata:"application/x-fontdata",presentation:"application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml",slideMaster:"application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml",slideLayout:"application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml",theme:"application/vnd.openxmlformats-officedocument.theme+xml",presProps:"application/vnd.openxmlformats-officedocument.presentationml.presProps+xml",viewProps:"application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml",tableStyles:"application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml",coreProps:"application/vnd.openxmlformats-package.core-properties+xml",appProps:"application/vnd.openxmlformats-officedocument.extended-properties+xml",slide:"application/vnd.openxmlformats-officedocument.presentationml.slide+xml",chart:"application/vnd.openxmlformats-officedocument.drawingml.chart+xml",chartEx:"application/vnd.ms-office.chartex+xml",chartDrawing:"application/vnd.openxmlformats-officedocument.drawingml.chartshapes+xml",notesMaster:"application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml",notesSlide:"application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml",commentAuthors:"application/vnd.openxmlformats-officedocument.presentationml.commentAuthors+xml",comments:"application/vnd.openxmlformats-officedocument.presentationml.comments+xml",customProps:"application/vnd.openxmlformats-officedocument.custom-properties+xml",handoutMaster:"application/vnd.openxmlformats-officedocument.presentationml.handoutMaster+xml"};function xt(e=1,t=0,r=!1,n=[],o,a=!1,i=!1,s=!1,l=!1,p=!1,m=0,c=[],f=!1,d=1,$=1){let g=new Lt;g.addDefault("rels",N.rels),g.addDefault("xml",N.xml),g.addDefault("png",N.png),g.addDefault("jpg",N.jpg),g.addDefault("jpeg",N.jpeg),g.addDefault("gif",N.gif),g.addDefault("webp",N.webp),g.addDefault("tiff",N.tiff),g.addDefault("bmp",N.bmp),f&&g.addDefault("svg",N.svg),i&&(g.addDefault("mp4",N.mp4),g.addDefault("webm",N.webm),g.addDefault("avi",N.avi),g.addDefault("mov",N.mov),g.addDefault("wmv",N.wmv)),s&&(g.addDefault("mp3",N.mp3),g.addDefault("wav",N.wav),g.addDefault("ogg",N.ogg),g.addDefault("m4a",N.m4a),g.addDefault("wma",N.wma)),(t>0||m>0)&&g.addDefault("xlsx",N.xlsx),g.addPart("ppt/presentation.xml",N.presentation);for(let F=1;F<=$;F++)g.addPart(`ppt/slideMasters/slideMaster${F}.xml`,N.slideMaster);for(let F=1;F<=d;F++)g.addPart(`ppt/slideLayouts/slideLayout${F}.xml`,N.slideLayout);g.addPart("ppt/theme/theme1.xml",N.theme),g.addPart("ppt/presProps.xml",N.presProps),g.addPart("ppt/viewProps.xml",N.viewProps),g.addPart("ppt/tableStyles.xml",N.tableStyles),g.addPart("docProps/core.xml",N.coreProps),g.addPart("docProps/app.xml",N.appProps);for(let F=1;F<=e;F++)g.addPart(`ppt/slides/slide${F}.xml`,N.slide);for(let F=1;F<=t;F++)g.addPart(`ppt/charts/chart${F}.xml`,N.chart);for(let F=1;F<=m;F++)g.addPart(`ppt/charts/chartEx${F}.xml`,N.chartEx);for(let F of c)g.addPart(`ppt/drawings/drawing${F}.xml`,N.chartDrawing);if(r){g.addPart("ppt/theme/theme2.xml",N.theme),g.addPart("ppt/notesMasters/notesMaster1.xml",N.notesMaster);for(let F of n)g.addPart(`ppt/notesSlides/notesSlide${F+1}.xml`,N.notesSlide)}if(o&&o.length>0){g.addPart("ppt/commentAuthors.xml",N.commentAuthors);for(let F of o)g.addPart(`ppt/comments/comment${F}.xml`,N.comments)}return a&&g.addDefault("fntdata",N.fntdata),l&&g.addPart("docProps/custom.xml",N.customProps),p&&g.addPart("ppt/handoutMasters/handoutMaster1.xml",N.handoutMaster),g.generateContentTypesXml()}function nt(e,t){return e+1+t}function yt(e,t){return e+t+5}function nn(e,t,r){return e+t+5+(r?1:0)}function Tt(e,t,r,n){return e+t+5+(r?1:0)+(n?1:0)}function go(e,t){let r=0;for(let n of e)n.webVideo?(r+=1,n.posterRId&&(r+=1)):(r+=2,n.posterRId&&(r+=1));return r+=t*2,r}function xo(e,t,r,n=0){return 2+e+t+r+n}var pe={officeDocument:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",coreProperties:"http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties",extendedProperties:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties",thumbnail:"http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail",customProperties:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties",slideMaster:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster",theme:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme",slide:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide",presProps:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps",viewProps:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/viewProps",tableStyles:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/tableStyles",notesMaster:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster",commentAuthors:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/commentAuthors",handoutMaster:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/handoutMaster"};function tr(e=!1,t=!1){let r=[{id:"rId1",type:pe.officeDocument,target:"ppt/presentation.xml"}];return e&&r.push({id:"rId2",type:pe.coreProperties,target:"docProps/core.xml"},{id:"rId3",type:pe.extendedProperties,target:"docProps/app.xml"},{id:"rId5",type:pe.thumbnail,target:"docProps/thumbnail.jpeg"}),t&&r.push({id:"rId4",type:pe.customProperties,target:"docProps/custom.xml"}),re(r)}function an(e=1,t=!1,r=!1,n,o=!1){let a=[{id:"rId1",type:pe.slideMaster,target:"slideMasters/slideMaster1.xml"},{id:"rId2",type:pe.theme,target:"theme/theme1.xml"}];for(let s=1;s<=e;s++){let l=nt(1,s);a.push({id:`rId${l}`,type:pe.slide,target:`slides/slide${s}.xml`})}let i=nt(1,e)+1;if(a.push({id:`rId${i++}`,type:pe.presProps,target:"presProps.xml"},{id:`rId${i++}`,type:pe.viewProps,target:"viewProps.xml"},{id:`rId${i++}`,type:pe.tableStyles,target:"tableStyles.xml"}),t){let s=yt(1,e);a.push({id:`rId${s}`,type:pe.notesMaster,target:"notesMasters/notesMaster1.xml"}),i=s+1}if(r){let s=nn(1,e,t);a.push({id:`rId${s}`,type:pe.commentAuthors,target:"commentAuthors.xml"}),i=s+1}if(o){let s=Tt(1,e,t,r);a.push({id:`rId${s}`,type:pe.handoutMaster,target:"handoutMasters/handoutMaster1.xml"}),i=s+1}if(n)for(let s of n)a.push({id:s.rId,type:s.type,target:s.target}),i++;return re(a)}function za(){let e=0;return()=>`00000000-0000-0000-0000-${(e++).toString(16).padStart(8,"0").padStart(12,"0")}`}function rr(e,t,r){let n=za(),o=Math.max(1,Math.floor(r?.masterCount??1)),a=t?Math.round(t.width*ie):Ce,i=t?Math.round(t.height*ie):ft,s=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;s+=`<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" saveSubsetFonts="1" autoCompressPictures="0">
`,s+=`  <p:sldMasterIdLst>
`;for(let c=0;c<o;c+=1)s+=`    <p:sldMasterId id="${2147483648+c*12}" r:id="rId${c+1}"/>
`;if(s+=`  </p:sldMasterIdLst>
`,r?.hasNotes&&r.notesMasterRId&&(s+=`  <p:notesMasterIdLst>
`,s+=`    <p:notesMasterId r:id="${r.notesMasterRId}"/>
`,s+=`  </p:notesMasterIdLst>
`),r?.hasHandoutMaster){let c=Tt(o,e,!!r?.hasNotes,!!r?.hasComments);s+=`  <p:handoutMasterIdLst>
`,s+=`    <p:handoutMasterId r:id="rId${c}"/>
`,s+=`  </p:handoutMasterIdLst>
`}s+=`  <p:sldIdLst>
`;for(let c=1;c<=e;c++){let f=qt+c,d=nt(o,c);s+=`    <p:sldId id="${f}" r:id="rId${d}"/>
`}s+=`  </p:sldIdLst>
`,s+=`  <p:sldSz cx="${a}" cy="${i}" type="custom"/>
`;let l=r?.notesSize?Math.round(r.notesSize.width*ie):6858e3,p=r?.notesSize?Math.round(r.notesSize.height*ie):9144e3;if(s+=`  <p:notesSz cx="${l}" cy="${p}"/>
`,r?.embeddedFontListXml&&(s+=r.embeddedFontListXml),r?.customShows&&r.customShows.length>0){s+=`  <p:custShowLst>
`;for(let c=0;c<r.customShows.length;c++){let f=r.customShows[c];s+=`    <p:custShow name="${I(f.name)}" id="${c}">
`,s+=`      <p:sldLst>
`;for(let d of f.slideIndices){let $=nt(o,d+1);s+=`        <p:sld r:id="rId${$}"/>
`}s+=`      </p:sldLst>
`,s+=`    </p:custShow>
`}s+=`  </p:custShowLst>
`}s+=`  <p:defaultTextStyle>
`,s+=`    <a:defPPr>
`,s+=`      <a:defRPr lang="en-US"/>
`,s+=`    </a:defPPr>
`;let m=[{tag:"a:lvl1pPr",marL:"0",sz:"1800"},{tag:"a:lvl2pPr",marL:"457200",sz:"1600"},{tag:"a:lvl3pPr",marL:"914400",sz:"1400"},{tag:"a:lvl4pPr",marL:"1371600",sz:"1200"},{tag:"a:lvl5pPr",marL:"1828800",sz:"1000"}];for(let c of m)s+=`    <${c.tag} marL="${c.marL}" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
`,s+=`      <a:defRPr sz="${c.sz}" kern="1200">
`,s+=`        <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
`,s+=`        <a:latin typeface="+mn-lt"/>
`,s+=`        <a:ea typeface="+mn-ea"/>
`,s+=`        <a:cs typeface="+mn-cs"/>
`,s+=`      </a:defRPr>
`,s+=`    </${c.tag}>
`;if(s+=`  </p:defaultTextStyle>
`,r?.protection){let c=r.protection;c.readOnly&&(s+='  <p:modifyVerifier cryptProviderType="rsaAES" cryptAlgorithmClass="hash" cryptAlgorithmType="typeAny" cryptAlgorithmSid="14" spinCount="100000"',c.modifyPassword&&(s+=` hashData="${I(c.modifyPassword)}"`),s+=`/>
`)}if(r?.sections&&r.sections.length>0){s+=`  <p:extLst>
`,s+=`    <p:ext uri="{521415D9-36F7-43E2-AB2F-B90AF26B5E84}">
`,s+=`      <p14:sectionLst xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main">
`;for(let c of r.sections){s+=`        <p14:section name="${I(c.name)}" id="{${n()}}">
`,s+=`          <p14:sldIdLst>
`;for(let f of c.slideIndices)s+=`            <p14:sldId id="${qt+1+f}"/>
`;s+=`          </p14:sldIdLst>
`,s+=`        </p14:section>
`}s+=`      </p14:sectionLst>
`,s+=`    </p:ext>
`,s+=`  </p:extLst>
`}return s+="</p:presentation>",s}import{createHash as Xa,randomUUID as Va}from"node:crypto";function Ua(e){let t=e.slice(0,32).split("");return t[12]="4",t[16]=(parseInt(t[16]??"0",16)&3|8).toString(16),[t.slice(0,8).join(""),t.slice(8,12).join(""),t.slice(12,16).join(""),t.slice(16,20).join(""),t.slice(20,32).join("")].join("-").toUpperCase()}function at(e){if(!Ue())return Va().toUpperCase();let t=Xa("sha256").update("paperjsx:pptx:ooxml-guid:").update(e).digest("hex");return Ua(t)}function sn(e,t){if(!e)return"";let r=`  <p:bg>
    <p:bgPr>
`;if(e.type==="solid")r+=`      <a:solidFill>${se(e.color)}</a:solidFill>
`;else if(e.type==="gradient"){r+=`      <a:gradFill>
`,r+=`        <a:gsLst>
`;for(let o of e.stops){let a=Math.min(1e5,Math.max(0,Math.round(o.position*1e3)));r+=`          <a:gs pos="${a}">${se(o.color)}</a:gs>
`}r+=`        </a:gsLst>
`;let n=wt(e.angle??180);r+=`        <a:lin ang="${n}" scaled="1"/>
`,r+=`      </a:gradFill>
`}else e.type==="pattern"?(r+=`      <a:pattFill prst="${I(e.pattern)}">
`,r+=`        <a:fgClr>${se(e.foreground)}</a:fgClr>
`,r+=`        <a:bgClr>${se(e.background)}</a:bgClr>
`,r+=`      </a:pattFill>
`):e.type==="image"&&t&&(r+=`      <a:blipFill>
`,r+=`        <a:blip r:embed="${t}"/>
`,e.tile?r+=`        <a:tile tx="0" ty="0" sx="100000" sy="100000"/>
`:r+=`        <a:stretch><a:fillRect/></a:stretch>
`,r+=`      </a:blipFill>
`);return r+=`      <a:effectLst/>
`,r+=`    </p:bgPr>
  </p:bg>
`,r}var Oa=11112/ft,Mt=365125,Ga=8229600/Ce,Ha=914400/Ce,ja=3028950/Ce,Wa=3086100/Ce,qa=457200/Ce,Ya=2133600/Ce;function Ka(e,t,r,n="slide"){if(!e)return"";let o=t??Ce,a=r??ft,i=Math.round(a-Mt-a*Oa),s="",l=1e3;return e.slideNumber&&(s+=`<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="${l++}" name="Slide Number Placeholder"/>
    <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
    <p:nvPr><p:ph type="sldNum" sz="quarter" idx="12"/></p:nvPr>
  </p:nvSpPr>
  <p:spPr>
    <a:xfrm>
      <a:off x="${Math.round(o*Ga)}" y="${i}"/>
      <a:ext cx="${Math.round(o*Ha)}" cy="${Mt}"/>
    </a:xfrm>
  </p:spPr>
  <p:txBody>
    <a:bodyPr/>
    <a:lstStyle/>
    <a:p>
      <a:fld id="{${at(`${n}:header-footer:slide-number`)}}" type="slidenum">
        <a:rPr lang="en-US" dirty="0"/>
        <a:t>&lt;#&gt;</a:t>
      </a:fld>
      <a:endParaRPr lang="en-US" dirty="0"/>
    </a:p>
  </p:txBody>
</p:sp>
`),e.footer&&(s+=`<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="${l++}" name="Footer Placeholder"/>
    <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
    <p:nvPr><p:ph type="ftr" sz="quarter" idx="11"/></p:nvPr>
  </p:nvSpPr>
  <p:spPr>
    <a:xfrm>
      <a:off x="${Math.round(o*ja)}" y="${i}"/>
      <a:ext cx="${Math.round(o*Wa)}" cy="${Mt}"/>
    </a:xfrm>
  </p:spPr>
  <p:txBody>
    <a:bodyPr/>
    <a:lstStyle/>
    <a:p>
      <a:r>
        <a:rPr lang="en-US" dirty="0"/>
        <a:t>${E(e.footer)}</a:t>
      </a:r>
      <a:endParaRPr lang="en-US" dirty="0"/>
    </a:p>
  </p:txBody>
</p:sp>
`),e.dateTime&&(s+=`<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="${l++}" name="Date Placeholder"/>
    <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
    <p:nvPr><p:ph type="dt" sz="half" idx="10"/></p:nvPr>
  </p:nvSpPr>
  <p:spPr>
    <a:xfrm>
      <a:off x="${Math.round(o*qa)}" y="${i}"/>
      <a:ext cx="${Math.round(o*Ya)}" cy="${Mt}"/>
    </a:xfrm>
  </p:spPr>
  <p:txBody>
    <a:bodyPr/>
    <a:lstStyle/>
    <a:p>
      <a:fld id="{${at(`${n}:header-footer:date-time`)}}" type="datetime1">
        <a:rPr lang="en-US" dirty="0"/>
        <a:t></a:t>
      </a:fld>
      <a:endParaRPr lang="en-US" dirty="0"/>
    </a:p>
  </p:txBody>
</p:sp>
`),s}function on(e,t="",r="",n,o,a,i,s,l="slide"){let p=sn(n,a),m=Ka(o,i,s,l),c=`${t}${r}`;return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" showMasterSp="0">
  <p:cSld>
${p}    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      ${e}${m}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr>
    <a:masterClrMapping/>
  </p:clrMapOvr>
${c}</p:sld>`}function ln(e,t=2147483649,r){let n=sn(r),o="";for(let a=0;a<e.length;a++)o+=`    <p:sldLayoutId id="${t+a}" r:id="${e[a]}"/>
`;return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
${n}    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
${o}  </p:sldLayoutIdLst>
  <p:txStyles>
    <p:titleStyle><a:lvl1pPr algn="l"><a:defRPr sz="4400" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mj-lt"/></a:defRPr></a:lvl1pPr></p:titleStyle>
    <p:bodyStyle><a:lvl1pPr marL="228600" indent="-228600" algn="l"><a:defRPr sz="2400" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/></a:defRPr></a:lvl1pPr></p:bodyStyle>
    <p:otherStyle><a:lvl1pPr><a:defRPr sz="1800" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/></a:defRPr></a:lvl1pPr></p:otherStyle>
  </p:txStyles>
</p:sldMaster>`}function nr(e="Blank"){return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1" showMasterSp="0">
  <p:cSld name="${I(e)}">
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr>
    <a:masterClrMapping/>
  </p:clrMapOvr>
</p:sldLayout>`}function cn(e=1){let t="";for(let r=0;r<e;r++)t+=`    <p:sldLayoutId id="${2147483649+r}" r:id="rId${r+1}"/>
`;return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg>
      <p:bgRef idx="1001">
        <a:schemeClr val="bg1"/>
      </p:bgRef>
    </p:bg>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
${t}  </p:sldLayoutIdLst>
  <p:txStyles>
    <p:titleStyle>
      <a:lvl1pPr algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
        <a:lnSpc><a:spcPct val="90000"/></a:lnSpc>
        <a:spcBef><a:spcPct val="0"/></a:spcBef>
        <a:defRPr sz="4400" kern="1200">
          <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
          <a:latin typeface="+mj-lt"/>
          <a:ea typeface="+mj-ea"/>
          <a:cs typeface="+mj-cs"/>
        </a:defRPr>
      </a:lvl1pPr>
    </p:titleStyle>
    <p:bodyStyle>
      <a:lvl1pPr marL="228600" indent="-228600" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
        <a:lnSpc><a:spcPct val="90000"/></a:lnSpc>
        <a:spcBef><a:spcPts val="1000"/></a:spcBef>
        <a:buFont typeface="Arial"/>
        <a:buChar char="&#x2022;"/>
        <a:defRPr sz="2400" kern="1200">
          <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
          <a:latin typeface="+mn-lt"/>
          <a:ea typeface="+mn-ea"/>
          <a:cs typeface="+mn-cs"/>
        </a:defRPr>
      </a:lvl1pPr>
      <a:lvl2pPr marL="685800" indent="-228600" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
        <a:lnSpc><a:spcPct val="90000"/></a:lnSpc>
        <a:spcBef><a:spcPts val="500"/></a:spcBef>
        <a:buFont typeface="Arial"/>
        <a:buChar char="&#x2013;"/>
        <a:defRPr sz="2000" kern="1200">
          <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
          <a:latin typeface="+mn-lt"/>
          <a:ea typeface="+mn-ea"/>
          <a:cs typeface="+mn-cs"/>
        </a:defRPr>
      </a:lvl2pPr>
      <a:lvl3pPr marL="1143000" indent="-228600" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
        <a:lnSpc><a:spcPct val="90000"/></a:lnSpc>
        <a:spcBef><a:spcPts val="500"/></a:spcBef>
        <a:buFont typeface="Arial"/>
        <a:buChar char="&#x2022;"/>
        <a:defRPr sz="1800" kern="1200">
          <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
          <a:latin typeface="+mn-lt"/>
          <a:ea typeface="+mn-ea"/>
          <a:cs typeface="+mn-cs"/>
        </a:defRPr>
      </a:lvl3pPr>
      <a:lvl4pPr marL="1600200" indent="-228600" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
        <a:lnSpc><a:spcPct val="90000"/></a:lnSpc>
        <a:spcBef><a:spcPts val="500"/></a:spcBef>
        <a:buFont typeface="Arial"/>
        <a:buChar char="&#x2013;"/>
        <a:defRPr sz="1800" kern="1200">
          <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
          <a:latin typeface="+mn-lt"/>
          <a:ea typeface="+mn-ea"/>
          <a:cs typeface="+mn-cs"/>
        </a:defRPr>
      </a:lvl4pPr>
      <a:lvl5pPr marL="2057400" indent="-228600" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
        <a:lnSpc><a:spcPct val="90000"/></a:lnSpc>
        <a:spcBef><a:spcPts val="500"/></a:spcBef>
        <a:buFont typeface="Arial"/>
        <a:buChar char="&#x2022;"/>
        <a:defRPr sz="1600" kern="1200">
          <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
          <a:latin typeface="+mn-lt"/>
          <a:ea typeface="+mn-ea"/>
          <a:cs typeface="+mn-cs"/>
        </a:defRPr>
      </a:lvl5pPr>
    </p:bodyStyle>
    <p:otherStyle>
      <a:lvl1pPr>
        <a:defRPr sz="1800" kern="1200">
          <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
          <a:latin typeface="+mn-lt"/>
          <a:ea typeface="+mn-ea"/>
          <a:cs typeface="+mn-cs"/>
        </a:defRPr>
      </a:lvl1pPr>
    </p:otherStyle>
  </p:txStyles>
</p:sldMaster>`}var Ja="758698067",Za="3730747076",Qa="1/1/00";function pn(e,t){let r,n=[];typeof e=="string"?r=`          <a:p>
            <a:r>
              <a:rPr lang="en-US" dirty="0"/>
              <a:t>${E(e)}</a:t>
            </a:r>
            <a:endParaRPr lang="en-US" dirty="0"/>
          </a:p>`:r=Ae(e,void 0,n,{current:100});let o=at(`notes-slide:${t}:slide-number`);return{xml:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Slide Image Placeholder 1"/>
          <p:cNvSpPr><a:spLocks noGrp="1" noRot="1" noChangeAspect="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="sldImg"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr/>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Notes Placeholder 2"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="body" idx="1"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
${r}
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="4" name="Slide Number Placeholder 3"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="sldNum" sz="quarter" idx="5"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:fld id="{${o}}" type="slidenum">
              <a:rPr lang="en-US" smtClean="0"/>
              <a:t>${E(String(t))}</a:t>
            </a:fld>
            <a:endParaRPr lang="en-US"/>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
    <p:extLst>
      <p:ext uri="{BB962C8B-B14F-4D97-AF65-F5344CB8AC3E}">
        <p14:creationId xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" val="${Za}"/>
      </p:ext>
    </p:extLst>
  </p:cSld>
  <p:clrMapOvr>
    <a:masterClrMapping/>
  </p:clrMapOvr>
</p:notes>`,hyperlinkRels:n}}function mn(){let e=at("notes-master:date"),t=at("notes-master:slide-number");return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notesMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg>
      <p:bgRef idx="1001">
        <a:schemeClr val="bg1"/>
      </p:bgRef>
    </p:bg>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Header Placeholder 1"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="hdr" sz="quarter"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="2971800" cy="458788"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0"/>
          <a:lstStyle><a:lvl1pPr algn="l"><a:defRPr sz="1200"/></a:lvl1pPr></a:lstStyle>
          <a:p><a:endParaRPr lang="en-US"/></a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Date Placeholder 2"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="dt" idx="1"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="3884613" y="0"/>
            <a:ext cx="2971800" cy="458788"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0"/>
          <a:lstStyle><a:lvl1pPr algn="r"><a:defRPr sz="1200"/></a:lvl1pPr></a:lstStyle>
          <a:p>
            <a:fld id="{${e}}" type="datetimeFigureOut">
              <a:rPr lang="en-US" smtClean="0"/>
              <a:t>${Qa}</a:t>
            </a:fld>
            <a:endParaRPr lang="en-US"/>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="4" name="Slide Image Placeholder 3"/>
          <p:cNvSpPr><a:spLocks noGrp="1" noRot="1" noChangeAspect="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="sldImg" idx="2"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="685800" y="1143000"/>
            <a:ext cx="5486400" cy="3086100"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/>
          <a:ln w="12700"><a:solidFill><a:prstClr val="black"/></a:solidFill></a:ln>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0" anchor="ctr"/>
          <a:lstStyle/>
          <a:p><a:endParaRPr lang="en-US"/></a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="5" name="Notes Placeholder 4"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="body" sz="quarter" idx="3"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="685800" y="4400550"/>
            <a:ext cx="5486400" cy="3600450"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0"/>
          <a:lstStyle/>
          <a:p><a:pPr lvl="0"/><a:r><a:rPr lang="en-US"/><a:t>Click to edit Master text styles</a:t></a:r></a:p>
          <a:p><a:pPr lvl="1"/><a:r><a:rPr lang="en-US"/><a:t>Second level</a:t></a:r></a:p>
          <a:p><a:pPr lvl="2"/><a:r><a:rPr lang="en-US"/><a:t>Third level</a:t></a:r></a:p>
          <a:p><a:pPr lvl="3"/><a:r><a:rPr lang="en-US"/><a:t>Fourth level</a:t></a:r></a:p>
          <a:p><a:pPr lvl="4"/><a:r><a:rPr lang="en-US"/><a:t>Fifth level</a:t></a:r><a:endParaRPr lang="en-US"/></a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="6" name="Footer Placeholder 5"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="ftr" sz="quarter" idx="4"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="8685213"/>
            <a:ext cx="2971800" cy="458787"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0" anchor="b"/>
          <a:lstStyle><a:lvl1pPr algn="l"><a:defRPr sz="1200"/></a:lvl1pPr></a:lstStyle>
          <a:p><a:endParaRPr lang="en-US"/></a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="7" name="Slide Number Placeholder 6"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="sldNum" sz="quarter" idx="5"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="3884613" y="8685213"/>
            <a:ext cx="2971800" cy="458787"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0" anchor="b"/>
          <a:lstStyle><a:lvl1pPr algn="r"><a:defRPr sz="1200"/></a:lvl1pPr></a:lstStyle>
          <a:p>
            <a:fld id="{${t}}" type="slidenum">
              <a:rPr lang="en-US" smtClean="0"/>
              <a:t>\u2039#\u203A</a:t>
            </a:fld>
            <a:endParaRPr lang="en-US"/>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
    <p:extLst>
      <p:ext uri="{BB962C8B-B14F-4D97-AF65-F5344CB8AC3E}">
        <p14:creationId xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" val="${Ja}"/>
      </p:ext>
    </p:extLst>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:notesStyle>
    <a:lvl1pPr marL="0" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
      <a:defRPr sz="1200" kern="1200">
        <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
        <a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/>
      </a:defRPr>
    </a:lvl1pPr>
    <a:lvl2pPr marL="457200" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
      <a:defRPr sz="1200" kern="1200">
        <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
        <a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/>
      </a:defRPr>
    </a:lvl2pPr>
    <a:lvl3pPr marL="914400" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
      <a:defRPr sz="1200" kern="1200">
        <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
        <a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/>
      </a:defRPr>
    </a:lvl3pPr>
    <a:lvl4pPr marL="1371600" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
      <a:defRPr sz="1200" kern="1200">
        <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
        <a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/>
      </a:defRPr>
    </a:lvl4pPr>
    <a:lvl5pPr marL="1828800" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
      <a:defRPr sz="1200" kern="1200">
        <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
        <a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/>
      </a:defRPr>
    </a:lvl5pPr>
    <a:lvl6pPr marL="2286000" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
      <a:defRPr sz="1200" kern="1200">
        <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
        <a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/>
      </a:defRPr>
    </a:lvl6pPr>
    <a:lvl7pPr marL="2743200" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
      <a:defRPr sz="1200" kern="1200">
        <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
        <a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/>
      </a:defRPr>
    </a:lvl7pPr>
    <a:lvl8pPr marL="3200400" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
      <a:defRPr sz="1200" kern="1200">
        <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
        <a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/>
      </a:defRPr>
    </a:lvl8pPr>
    <a:lvl9pPr marL="3657600" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
      <a:defRPr sz="1200" kern="1200">
        <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
        <a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/>
      </a:defRPr>
    </a:lvl9pPr>
  </p:notesStyle>
</p:notesMaster>`}var te={slideLayout:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout",image:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",video:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/video",media:"http://schemas.microsoft.com/office/2007/relationships/media",audio:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/audio",hyperlink:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",chartEx:"http://schemas.microsoft.com/office/2014/relationships/chartEx",chart:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart",notesSlide:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide",comments:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments",notesMaster:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster",slide:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide",theme:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme",slideMaster:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster"};function Le(e){if(!e)return null;let t=/^rId(\d+)$/.exec(e);return t?parseInt(t[1],10):null}function dn(e=[],t=[],r=[],n,o="../slideLayouts/slideLayout1.xml",a,i=[],s=[],l=[]){let p=[{id:"rId1",type:te.slideLayout,target:o}],m=1;for(let c of e)m=Math.max(m,Le(c.rId)??m);for(let c of t)m=Math.max(m,Le(c.rId)??m);for(let c of r)m=Math.max(m,Le(c.rId)??m);for(let c of i)m=Math.max(m,Le(c.videoRId)??m),m=Math.max(m,Le(c.mediaRId)??m),m=Math.max(m,Le(c.posterRId)??m);for(let c of s)m=Math.max(m,Le(c.audioRId)??m),m=Math.max(m,Le(c.mediaRId)??m);for(let c of l)m=Math.max(m,Le(c.rId)??m);for(let c of e)p.push({id:c.rId,type:te.image,target:c.target});for(let c of i)c.videoRId&&p.push({id:c.videoRId,type:te.video,target:c.videoTarget}),c.mediaRId&&p.push({id:c.mediaRId,type:te.media,target:c.videoTarget}),c.posterRId&&c.posterTarget&&p.push({id:c.posterRId,type:te.image,target:c.posterTarget});for(let c of s)p.push({id:c.audioRId,type:te.audio,target:c.audioTarget},{id:c.mediaRId,type:te.media,target:c.audioTarget});for(let c of l)p.push({id:c.rId,type:te.image,target:c.target});for(let c of t){let f=c.external!==!1;p.push({id:c.rId,type:te.hyperlink,target:c.url,targetMode:f?"External":void 0})}for(let c of r)c.type==="chartEx"?p.push({id:c.rId,type:te.chartEx,target:c.target}):p.push({id:c.rId,type:te.chart,target:c.target});if(n!==void 0){let c=m+1;p.push({id:`rId${c}`,type:te.notesSlide,target:`../notesSlides/notesSlide${n}.xml`}),m=c}if(a!==void 0){let c=m+1;p.push({id:`rId${c}`,type:te.comments,target:`../comments/comment${a}.xml`})}return re(p)}function fn(e,t=[]){let r=[{id:"rId1",type:te.notesMaster,target:"../notesMasters/notesMaster1.xml"},{id:"rId2",type:te.slide,target:`../slides/slide${e}.xml`}];for(let n of t)r.push({id:n.rId,type:te.hyperlink,target:n.url,targetMode:"External"});return re(r)}function hn(e="../theme/theme2.xml"){return re([{id:"rId1",type:te.theme,target:e}])}function un(e=1){let t=[];for(let r=1;r<=e;r++)t.push({id:`rId${r}`,type:te.slideLayout,target:`../slideLayouts/slideLayout${r}.xml`});return t.push({id:`rId${e+1}`,type:te.theme,target:"../theme/theme1.xml"}),re(t)}function ar(e="../slideMasters/slideMaster1.xml"){return re([{id:"rId1",type:te.slideMaster,target:e}])}var es={dk2:"44546A",lt2:"E7E6E6",accent1:"4472C4",accent2:"ED7D31",accent3:"A9D18E",accent4:"FFC000",accent5:"5B9BD5",accent6:"70AD47",hlink:"0563C1",folHlink:"954F72"};function ts(e){return e.startsWith("#")?e.slice(1):e}function rs(e,t){if(t)return`<a:${e}><a:srgbClr val="${ts(t).toUpperCase()}"/></a:${e}>`;if(e==="dk1")return'<a:dk1><a:sysClr lastClr="000000" val="windowText"/></a:dk1>';if(e==="lt1")return'<a:lt1><a:sysClr lastClr="FFFFFF" val="window"/></a:lt1>';let r=es[e];return`<a:${e}><a:srgbClr val="${r}"/></a:${e}>`}function gn(e){let t=e?.name??"Office Theme",r=e?.colorScheme,n=e?.fontScheme,a=["dk1","lt1","dk2","lt2","accent1","accent2","accent3","accent4","accent5","accent6","hlink","folHlink"].map(m=>rs(m,r?.[m])).join(`
      `),i=n?.majorLatin?`<a:latin typeface="${E(n.majorLatin)}"/>`:'<a:latin typeface="Carlito"/>',s=n?.majorEa?`<a:ea typeface="${E(n.majorEa)}"/>`:'<a:ea typeface=""/>',l=n?.minorLatin?`<a:latin typeface="${E(n.minorLatin)}"/>`:'<a:latin typeface="Carlito"/>',p=n?.minorEa?`<a:ea typeface="${E(n.minorEa)}"/>`:'<a:ea typeface=""/>';return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="${E(t)}">
  <a:themeElements>
    <a:clrScheme name="${E(t)}">
      ${a}
    </a:clrScheme>
    <a:fontScheme name="Office">
      <a:majorFont>
        ${i}
        ${s}
        <a:cs typeface=""/>
        <!-- Batch E will replace these script slots once matching assets are admitted. -->
        <a:font script="Jpan" typeface="Yu Gothic Light"/>
        <a:font script="Hang" typeface="\uB9D1\uC740 \uACE0\uB515"/>
        <a:font script="Hans" typeface="DengXian Light"/>
        <a:font script="Hant" typeface="\u65B0\u7D30\u660E\u9AD4"/>
        <a:font script="Arab" typeface="Times New Roman"/>
        <a:font script="Hebr" typeface="Times New Roman"/>
        <a:font script="Thai" typeface="Angsana New"/>
        <a:font script="Deva" typeface="Mangal"/>
      </a:majorFont>
      <a:minorFont>
        ${l}
        ${p}
        <a:cs typeface=""/>
        <!-- Batch E will replace these script slots once matching assets are admitted. -->
        <a:font script="Jpan" typeface="Yu Gothic"/>
        <a:font script="Hang" typeface="\uB9D1\uC740 \uACE0\uB515"/>
        <a:font script="Hans" typeface="DengXian"/>
        <a:font script="Hant" typeface="\u65B0\u7D30\u660E\u9AD4"/>
        <a:font script="Arab" typeface="Arial"/>
        <a:font script="Hebr" typeface="Arial"/>
        <a:font script="Thai" typeface="Cordia New"/>
        <a:font script="Deva" typeface="Mangal"/>
      </a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Office">
      <a:fillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:lumMod val="110000"/><a:satMod val="105000"/><a:tint val="67000"/></a:schemeClr></a:gs><a:gs pos="50000"><a:schemeClr val="phClr"><a:lumMod val="105000"/><a:satMod val="103000"/><a:tint val="73000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:lumMod val="105000"/><a:satMod val="109000"/><a:tint val="81000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill>
        <a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:satMod val="103000"/><a:lumMod val="102000"/><a:tint val="94000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:lumMod val="99000"/><a:satMod val="120000"/><a:shade val="78000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="6350" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>
        <a:ln w="12700" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>
        <a:ln w="19050" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>
      </a:lnStyleLst>
      <a:effectStyleLst>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst><a:outerShdw blurRad="57150" dist="19050" dir="5400000" algn="ctr" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="63000"/></a:srgbClr></a:outerShdw></a:effectLst></a:effectStyle>
      </a:effectStyleLst>
      <a:bgFillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"><a:tint val="95000"/><a:satMod val="170000"/></a:schemeClr></a:solidFill>
        <a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="93000"/><a:satMod val="150000"/><a:shade val="98000"/><a:lumMod val="102000"/></a:schemeClr></a:gs><a:gs pos="50000"><a:schemeClr val="phClr"><a:tint val="98000"/><a:lumMod val="102000"/><a:satMod val="130000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="90000"/><a:satMod val="120000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill>
      </a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
  <a:objectDefaults/>
  <a:extraClrSchemeLst/>
</a:theme>`}function xn(){return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme"><a:themeElements><a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="0E2841"/></a:dk2><a:lt2><a:srgbClr val="E8E8E8"/></a:lt2><a:accent1><a:srgbClr val="156082"/></a:accent1><a:accent2><a:srgbClr val="E97132"/></a:accent2><a:accent3><a:srgbClr val="196B24"/></a:accent3><a:accent4><a:srgbClr val="0F9ED5"/></a:accent4><a:accent5><a:srgbClr val="A02B93"/></a:accent5><a:accent6><a:srgbClr val="4EA72E"/></a:accent6><a:hlink><a:srgbClr val="467886"/></a:hlink><a:folHlink><a:srgbClr val="96607D"/></a:folHlink></a:clrScheme><a:fontScheme name="Office"><a:majorFont><a:latin typeface="Carlito"/><a:ea typeface=""/><a:cs typeface=""/><a:font script="Jpan" typeface="\u6E38\u30B4\u30B7\u30C3\u30AF Light"/><a:font script="Hang" typeface="\uB9D1\uC740 \uACE0\uB515"/><a:font script="Hans" typeface="\u7B49\u7EBF Light"/><a:font script="Hant" typeface="\u65B0\u7D30\u660E\u9AD4"/><a:font script="Arab" typeface="Times New Roman"/><a:font script="Hebr" typeface="Times New Roman"/><a:font script="Thai" typeface="Angsana New"/><a:font script="Ethi" typeface="Nyala"/><a:font script="Beng" typeface="Vrinda"/><a:font script="Gujr" typeface="Shruti"/><a:font script="Khmr" typeface="MoolBoran"/><a:font script="Knda" typeface="Tunga"/><a:font script="Guru" typeface="Raavi"/><a:font script="Cans" typeface="Euphemia"/><a:font script="Cher" typeface="Plantagenet Cherokee"/><a:font script="Yiii" typeface="Microsoft Yi Baiti"/><a:font script="Tibt" typeface="Microsoft Himalaya"/><a:font script="Thaa" typeface="MV Boli"/><a:font script="Deva" typeface="Mangal"/><a:font script="Telu" typeface="Gautami"/><a:font script="Taml" typeface="Latha"/><a:font script="Syrc" typeface="Estrangelo Edessa"/><a:font script="Orya" typeface="Kalinga"/><a:font script="Mlym" typeface="Kartika"/><a:font script="Laoo" typeface="DokChampa"/><a:font script="Sinh" typeface="Iskoola Pota"/><a:font script="Mong" typeface="Mongolian Baiti"/><a:font script="Viet" typeface="Times New Roman"/><a:font script="Uigh" typeface="Microsoft Uighur"/><a:font script="Geor" typeface="Sylfaen"/><a:font script="Armn" typeface="Arial"/><a:font script="Bugi" typeface="Leelawadee UI"/><a:font script="Bopo" typeface="Microsoft JhengHei"/><a:font script="Java" typeface="Javanese Text"/><a:font script="Lisu" typeface="Segoe UI"/><a:font script="Mymr" typeface="Myanmar Text"/><a:font script="Nkoo" typeface="Ebrima"/><a:font script="Olck" typeface="Nirmala UI"/><a:font script="Osma" typeface="Ebrima"/><a:font script="Phag" typeface="Phagspa"/><a:font script="Syrn" typeface="Estrangelo Edessa"/><a:font script="Syrj" typeface="Estrangelo Edessa"/><a:font script="Syre" typeface="Estrangelo Edessa"/><a:font script="Sora" typeface="Nirmala UI"/><a:font script="Tale" typeface="Microsoft Tai Le"/><a:font script="Talu" typeface="Microsoft New Tai Lue"/><a:font script="Tfng" typeface="Ebrima"/></a:majorFont><a:minorFont><a:latin typeface="Carlito"/><a:ea typeface=""/><a:cs typeface=""/><a:font script="Jpan" typeface="\u6E38\u30B4\u30B7\u30C3\u30AF"/><a:font script="Hang" typeface="\uB9D1\uC740 \uACE0\uB515"/><a:font script="Hans" typeface="\u7B49\u7EBF"/><a:font script="Hant" typeface="\u65B0\u7D30\u660E\u9AD4"/><a:font script="Arab" typeface="Arial"/><a:font script="Hebr" typeface="Arial"/><a:font script="Thai" typeface="Cordia New"/><a:font script="Ethi" typeface="Nyala"/><a:font script="Beng" typeface="Vrinda"/><a:font script="Gujr" typeface="Shruti"/><a:font script="Khmr" typeface="DaunPenh"/><a:font script="Knda" typeface="Tunga"/><a:font script="Guru" typeface="Raavi"/><a:font script="Cans" typeface="Euphemia"/><a:font script="Cher" typeface="Plantagenet Cherokee"/><a:font script="Yiii" typeface="Microsoft Yi Baiti"/><a:font script="Tibt" typeface="Microsoft Himalaya"/><a:font script="Thaa" typeface="MV Boli"/><a:font script="Deva" typeface="Mangal"/><a:font script="Telu" typeface="Gautami"/><a:font script="Taml" typeface="Latha"/><a:font script="Syrc" typeface="Estrangelo Edessa"/><a:font script="Orya" typeface="Kalinga"/><a:font script="Mlym" typeface="Kartika"/><a:font script="Laoo" typeface="DokChampa"/><a:font script="Sinh" typeface="Iskoola Pota"/><a:font script="Mong" typeface="Mongolian Baiti"/><a:font script="Viet" typeface="Arial"/><a:font script="Uigh" typeface="Microsoft Uighur"/><a:font script="Geor" typeface="Sylfaen"/><a:font script="Armn" typeface="Arial"/><a:font script="Bugi" typeface="Leelawadee UI"/><a:font script="Bopo" typeface="Microsoft JhengHei"/><a:font script="Java" typeface="Javanese Text"/><a:font script="Lisu" typeface="Segoe UI"/><a:font script="Mymr" typeface="Myanmar Text"/><a:font script="Nkoo" typeface="Ebrima"/><a:font script="Olck" typeface="Nirmala UI"/><a:font script="Osma" typeface="Ebrima"/><a:font script="Phag" typeface="Phagspa"/><a:font script="Syrn" typeface="Estrangelo Edessa"/><a:font script="Syrj" typeface="Estrangelo Edessa"/><a:font script="Syre" typeface="Estrangelo Edessa"/><a:font script="Sora" typeface="Nirmala UI"/><a:font script="Tale" typeface="Microsoft Tai Le"/><a:font script="Talu" typeface="Microsoft New Tai Lue"/><a:font script="Tfng" typeface="Ebrima"/></a:minorFont></a:fontScheme><a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:lumMod val="110000"/><a:satMod val="105000"/><a:tint val="67000"/></a:schemeClr></a:gs><a:gs pos="50000"><a:schemeClr val="phClr"><a:lumMod val="105000"/><a:satMod val="103000"/><a:tint val="73000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:lumMod val="105000"/><a:satMod val="109000"/><a:tint val="81000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:satMod val="103000"/><a:lumMod val="102000"/><a:tint val="94000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:lumMod val="99000"/><a:satMod val="120000"/><a:shade val="78000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln><a:ln w="12700" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln><a:ln w="19050" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst><a:outerShdw blurRad="57150" dist="19050" dir="5400000" algn="ctr" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="63000"/></a:srgbClr></a:outerShdw></a:effectLst></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"><a:tint val="95000"/><a:satMod val="170000"/></a:schemeClr></a:solidFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="93000"/><a:satMod val="150000"/><a:shade val="98000"/><a:lumMod val="102000"/></a:schemeClr></a:gs><a:gs pos="50000"><a:schemeClr val="phClr"><a:tint val="98000"/><a:lumMod val="102000"/><a:satMod val="130000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="90000"/><a:satMod val="120000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>`}function yn(e,t,r){let n=Ue()?ae.toISOString().replace(/\.\d{3}Z/,"Z"):new Date().toISOString().replace(/\.\d{3}Z/,"Z"),o=e?`  <dc:title>${E(e)}</dc:title>`:"  <dc:title/>",a=t?`  <dc:creator>${E(t)}</dc:creator>`:"  <dc:creator>Runstamp</dc:creator>",i=r?`
  <dc:language>${E(r)}</dc:language>`:"";return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
${o}
${a}${i}
  <cp:lastModifiedBy>${t?E(t):"Runstamp"}</cp:lastModifiedBy>
  <cp:revision>1</cp:revision>
  <dcterms:created xsi:type="dcterms:W3CDTF">${n}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${n}</dcterms:modified>
</cp:coreProperties>`}function vn(e,t,r){let n=t??"Carlito",o=r??"Carlito",a="";a+=`      <vt:lpstr>${E(o)}</vt:lpstr>
`,a+=`      <vt:lpstr>${E(n)}</vt:lpstr>
`,a+=`      <vt:lpstr>Office Theme</vt:lpstr>
`;for(let s=1;s<=e;s++)a+=`      <vt:lpstr>Slide ${s}</vt:lpstr>
`;let i=3+e;return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Runstamp</Application>
  <PresentationFormat>On-screen Show (16:9)</PresentationFormat>
  <Slides>${e}</Slides>
  <HiddenSlides>0</HiddenSlides>
  <ScaleCrop>false</ScaleCrop>
  <HeadingPairs>
    <vt:vector size="6" baseType="variant">
      <vt:variant><vt:lpstr>Fonts Used</vt:lpstr></vt:variant>
      <vt:variant><vt:i4>2</vt:i4></vt:variant>
      <vt:variant><vt:lpstr>Theme</vt:lpstr></vt:variant>
      <vt:variant><vt:i4>1</vt:i4></vt:variant>
      <vt:variant><vt:lpstr>Slide Titles</vt:lpstr></vt:variant>
      <vt:variant><vt:i4>${e}</vt:i4></vt:variant>
    </vt:vector>
  </HeadingPairs>
  <TitlesOfParts>
    <vt:vector size="${i}" baseType="lpstr">
${a}    </vt:vector>
  </TitlesOfParts>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0000</AppVersion>
</Properties>`}var ns="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}";function as(e){return typeof e=="string"?`<vt:lpwstr>${E(e)}</vt:lpwstr>`:typeof e=="number"?Number.isInteger(e)?`<vt:i4>${e}</vt:i4>`:`<vt:r8>${e}</vt:r8>`:typeof e=="boolean"?`<vt:bool>${e}</vt:bool>`:e instanceof Date?`<vt:filetime>${Ue()?ae.toISOString():e.toISOString()}</vt:filetime>`:`<vt:lpwstr>${E(String(e))}</vt:lpwstr>`}function Pn(e){let t=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;t+=`<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
`;for(let r=0;r<e.length;r++){let n=e[r],o=r+2;t+=`  <property fmtid="${ns}" pid="${o}" name="${E(n.name)}">${as(n.value)}</property>
`}return t+="</Properties>",t}function $n(){return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:handoutMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Header Placeholder 1"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="hdr" sz="quarter"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="2971800" cy="458788"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0"/>
          <a:lstStyle/>
          <a:p><a:endParaRPr lang="en-US" dirty="0"/></a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Date Placeholder 2"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="dt" sz="quarter" idx="1"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="3884613" y="0"/>
            <a:ext cx="2971800" cy="458788"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0"/>
          <a:lstStyle/>
          <a:p><a:endParaRPr lang="en-US" dirty="0"/></a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="4" name="Footer Placeholder 3"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="ftr" sz="quarter" idx="2"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="8685213"/>
            <a:ext cx="2971800" cy="458787"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0" anchor="b"/>
          <a:lstStyle/>
          <a:p><a:endParaRPr lang="en-US" dirty="0"/></a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="5" name="Slide Number Placeholder 4"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="sldNum" sz="quarter" idx="3"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="3884613" y="8685213"/>
            <a:ext cx="2971800" cy="458787"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0" anchor="b"/>
          <a:lstStyle/>
          <a:p>
            <a:fld id="{B6F15528-F159-4107-1234-000000000010}" type="slidenum">
              <a:rPr lang="en-US" dirty="0"/>
              <a:t>&lt;#&gt;</a:t>
            </a:fld>
            <a:endParaRPr lang="en-US" dirty="0"/>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
</p:handoutMaster>`}function bn(){return re([{id:"rId1",type:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme",target:"../theme/theme1.xml"}])}function Cn(e){let t="";if(e){let r=[];e.colorMode&&r.push(`clrMode="${e.colorMode}"`),e.frameSlides&&r.push('frameSlides="1"'),e.scaleToFitPaper&&r.push('scaleToFitPaper="1"'),r.length>0&&(t+=`  <p:prnPr ${r.join(" ")}/>
`)}return t?`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentationPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
${t}</p:presentationPr>`:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentationPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>`}function Sn(){return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:viewPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:normalViewPr>
    <p:restoredLeft sz="15620"/>
    <p:restoredTop sz="94660"/>
  </p:normalViewPr>
  <p:slideViewPr>
    <p:cSldViewPr>
      <p:cViewPr varScale="1">
        <p:scale><a:sx n="100" d="100"/><a:sy n="100" d="100"/></p:scale>
        <p:origin x="0" y="0"/>
      </p:cViewPr>
    </p:cSldViewPr>
  </p:slideViewPr>
</p:viewPr>`}function wn(){return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:tblStyleLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>`}function ss(){let r=[],n=(...d)=>r.push(...d);n(255,216),n(255,224);let o=[74,70,73,70,0,1,1,0,0,1,0,1,0,0];n(o.length+2>>8,o.length+2&255,...o),n(255,219);let a=[0];for(let d=0;d<64;d++)a.push(1);n(a.length+2>>8,a.length+2&255,...a),n(255,192);let i=[8,0,192,1,0,1,1,17,0];n(i.length+2>>8,i.length+2&255,...i),n(255,196);let s=[0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];n(s.length+2>>8,s.length+2&255,...s),n(255,196);let l=[16,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];n(l.length+2>>8,l.length+2&255,...l),n(255,218);let p=[1,1,0,0,63,0];n(p.length+2>>8,p.length+2&255,...p);let c=256/8*(192/8)*2,f=Math.ceil(c/8);for(let d=0;d<f;d++)n(0);return n(255,217),Buffer.from(r)}function os(e,t,r,n=!1,o,a=!1){let i=[];for(let l=1;l<=t;l++)i.push({id:`rId${l}`,type:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster",target:`slideMasters/slideMaster${l}.xml`});let s=t+1;i.push({id:`rId${s++}`,type:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme",target:"theme/theme1.xml"});for(let l=1;l<=e;l++)i.push({id:`rId${s++}`,type:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide",target:`slides/slide${l}.xml`});if(i.push({id:`rId${s++}`,type:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps",target:"presProps.xml"},{id:`rId${s++}`,type:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/viewProps",target:"viewProps.xml"},{id:`rId${s++}`,type:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/tableStyles",target:"tableStyles.xml"}),r&&i.push({id:`rId${s++}`,type:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster",target:"notesMasters/notesMaster1.xml"}),n&&i.push({id:`rId${s++}`,type:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/commentAuthors",target:"commentAuthors.xml"}),a&&i.push({id:`rId${s++}`,type:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/handoutMaster",target:"handoutMasters/handoutMaster1.xml"}),o)for(let l of o)i.push({id:l.rId,type:l.type,target:l.target});return re(i)}var In=class{zip;masterLayoutMap;thumbnailBuffer;shouldValidateOpcInvariants=!1;constructor(){this.zip=new Rn.default,this.initializeOPC()}zipOpts(){return Ue()?{date:ae}:{}}addFolder(t){let r=t.endsWith("/")?t:`${t}/`;return this.zip.file(r,null,{...this.zipOpts(),dir:!0}),this.zip.folder(t)}ensureParentFolders(t){let r=t.split("/").slice(0,-1),n="";for(let o of r){n=n?`${n}/${o}`:o;let a=`${n}/`;this.zip.files[a]||this.zip.file(a,null,{...this.zipOpts(),dir:!0})}}initializeOPC(){this.zip.file("[Content_Types].xml",xt(),this.zipOpts()),this.addFolder("_rels").file(".rels",tr(),this.zipOpts()),this.addFolder("ppt"),this.addFolder("ppt/_rels"),this.addFolder("ppt/slides"),this.addFolder("ppt/slides/_rels"),this.addFolder("ppt/slideLayouts"),this.addFolder("ppt/slideLayouts/_rels"),this.addFolder("ppt/slideMasters"),this.addFolder("ppt/slideMasters/_rels"),this.addFolder("ppt/theme"),this.addFolder("ppt/media")}addFile(t,r){this.ensureParentFolders(t),this.zip.file(t,r,this.zipOpts())}setThumbnail(t){this.thumbnailBuffer=t,this.zip.file("docProps/thumbnail.jpeg",t,this.zipOpts())}assemblePresentation(t,r={}){let n=r.slideContents??[],o=r.slideMediaManifests??[],a=r.slideChartManifests??[],i=r.slideHyperlinkRels??[],s=r.slideTransitionXmls??[],l=r.slideTimingXmls??[],p=r.slideBackgrounds??[],m=r.slideNotes??[],c=r.meta,f=r.slideSize,d=r.slideHeaderFooters??[],$=r.themeConfig,g=r.sections,F=r.protection,P=r.customShows,u=r.notesSize,X=r.embeddedFontListXml,D=r.extraPresentationRels,A=r.commentSlideInfos,T=r.commentAuthorsXml,G=r.fontDataFiles,k=r.mastersConfig,x=r.slideMasterNames,v=r.slideBgImageAssets,b=r.customProperties,M=r.handoutLayout,_=r.printSettings,q=r.thumbnailBuffer,w=0,z=0,W=[];for(let R of a)for(let K of R.charts)!K.chartXml||!K.chartRelsXml||!K.excelBuffer||(K.isChartEx?z++:w++,K.chartDrawingXml&&W.push(K.chartIndex));let j=m.some(R=>R!==void 0&&R!==""&&!(Array.isArray(R)&&R.length===0)),J=[];for(let R=0;R<t;R++){let K=m[R];K!==void 0&&K!==""&&!(Array.isArray(K)&&K.length===0)&&J.push(R)}let S=this.zipOpts(),h=A&&A.length>0,L=o.some(R=>R.videoAssets&&R.videoAssets.length>0),B=o.some(R=>R.audioAssets&&R.audioAssets.length>0),H=o.some(R=>R.svgAssets&&R.svgAssets.length>0),Y=b!==void 0&&b.length>0,V=M!==void 0;this.zip.file("[Content_Types].xml",xt(t,w,j,J,A?.map(R=>R.commentFileIndex),G&&G.length>0,L,B,Y,V,z,W,H),S),this.addFolder("docProps"),this.zip.file("docProps/core.xml",yn(c?.title,c?.author,c?.language),S),this.zip.file("docProps/app.xml",vn(t,$?.fontScheme?.majorLatin,$?.fontScheme?.minorLatin),S);let ne=b&&b.length>0;ne&&this.zip.file("docProps/custom.xml",Pn(b),S),this.thumbnailBuffer=q??this.thumbnailBuffer??ss(),this.zip.file("docProps/thumbnail.jpeg",this.thumbnailBuffer,S),this.addFolder("_rels").file(".rels",tr(!0,ne),S);let ye=M!==void 0;ye&&(this.addFolder("ppt/handoutMasters"),this.addFolder("ppt/handoutMasters/_rels"),this.zip.file("ppt/handoutMasters/handoutMaster1.xml",$n(),S),this.zip.file("ppt/handoutMasters/_rels/handoutMaster1.xml.rels",bn(),S));let oe=j?`rId${yt(1,t)}`:void 0;if(this.zip.file("ppt/presentation.xml",rr(t,f,{sections:g,protection:F,customShows:P,notesSize:u,embeddedFontListXml:X,hasHandoutMaster:ye,hasNotes:j,hasComments:!!h,notesMasterRId:oe}),S),this.zip.file("ppt/_rels/presentation.xml.rels",an(t,j,h,D,ye),S),h&&T&&this.zip.file("ppt/commentAuthors.xml",T,S),G){this.addFolder("ppt/fonts");for(let R of G)this.zip.file(R.path,R.buffer,S)}if(k&&k.length>0){let R=1,K=new Map;for(let fe=0;fe<k.length;fe++){let xe=k[fe],be=fe+1,Ye=R,Ge=xe.layouts.length;K.set(xe.name,{masterIndex:be,firstLayoutIndex:Ye,layoutCount:Ge});let dt=[];for(let ve=0;ve<Ge;ve++){let Re=R++,Ht=`rId${ve+1}`;dt.push(Ht),this.zip.file(`ppt/slideLayouts/slideLayout${Re}.xml`,nr(xe.layouts[ve].name),S),this.zip.file(`ppt/slideLayouts/_rels/slideLayout${Re}.xml.rels`,ar(`../slideMasters/slideMaster${be}.xml`),S)}let Ve=2147483649+(Ye-1);this.zip.file(`ppt/slideMasters/slideMaster${be}.xml`,ln(dt,Ve,xe.background),S);let Ke=[];for(let ve=0;ve<Ge;ve++){let Re=Ye+ve;Ke.push({id:`rId${ve+1}`,type:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout",target:`../slideLayouts/slideLayout${Re}.xml`})}Ke.push({id:`rId${Ge+1}`,type:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme",target:"../theme/theme1.xml"}),this.zip.file(`ppt/slideMasters/_rels/slideMaster${be}.xml.rels`,re(Ke),S)}let U=R-1,de=xt(t,w,j,J,A?.map(fe=>fe.commentFileIndex),G&&G.length>0,L,B,Y,V,z,W,H,U,k.length);this.zip.file("[Content_Types].xml",de,S);let $e=j?`rId${yt(k.length,t)}`:void 0,Xe=rr(t,f,{sections:g,protection:F,customShows:P,notesSize:u,embeddedFontListXml:X,hasNotes:j,hasComments:!!h,hasHandoutMaster:V,notesMasterRId:$e,masterCount:k.length});this.zip.file("ppt/presentation.xml",Xe,S);let ge=os(t,k.length,j,h,D,V);this.zip.file("ppt/_rels/presentation.xml.rels",ge,S),this.masterLayoutMap=K}else{let R=["Blank","Title Slide","Section Header","Two Content","Title Only"],K=R.length;this.zip.file("ppt/slideMasters/slideMaster1.xml",cn(K),S),this.zip.file("ppt/slideMasters/_rels/slideMaster1.xml.rels",un(K),S);for(let U=0;U<K;U++)this.zip.file(`ppt/slideLayouts/slideLayout${U+1}.xml`,nr(R[U]),S),this.zip.file(`ppt/slideLayouts/_rels/slideLayout${U+1}.xml.rels`,ar(),S);this.zip.file("[Content_Types].xml",xt(t,w,j,J,A?.map(U=>U.commentFileIndex),G&&G.length>0,L,B,Y,V,z,W,H,K),S)}this.zip.file("ppt/theme/theme1.xml",gn($),S),j&&this.zip.file("ppt/theme/theme2.xml",xn(),S),this.zip.file("ppt/presProps.xml",Cn(_),S),this.zip.file("ppt/viewProps.xml",Sn(),S),this.zip.file("ppt/tableStyles.xml",wn(),S),j&&(this.addFolder("ppt/notesMasters"),this.addFolder("ppt/notesMasters/_rels"),this.addFolder("ppt/notesSlides"),this.addFolder("ppt/notesSlides/_rels"),this.zip.file("ppt/notesMasters/notesMaster1.xml",mn(),S),this.zip.file("ppt/notesMasters/_rels/notesMaster1.xml.rels",hn(),S)),(w>0||z>0)&&(this.addFolder("ppt/charts"),this.addFolder("ppt/charts/_rels"),this.addFolder("ppt/embeddings")),W.length>0&&this.addFolder("ppt/drawings");for(let R=1;R<=t;R++){let K=n[R-1]??"",U=o[R-1],de=a[R-1],$e=i[R-1]??[],Xe=p[R-1],ge=m[R-1],fe=d[R-1],xe=[];if(U){for(let C of U.assets)this.zip.file(C.mediaPath,C.buffer,S),xe.push({rId:C.rId,target:C.relativePath});for(let C of U.fillAssets)this.zip.file(C.mediaPath,C.buffer,S),xe.push({rId:C.rId,target:C.relativePath})}let be=[];if(U?.videoAssets)for(let C of U.videoAssets)if(C.buffer.length>0&&this.zip.file(C.mediaPath,C.buffer,S),C.posterRId&&C.posterBuffer&&C.posterMediaPath&&C.posterRelativePath&&this.zip.file(C.posterMediaPath,C.posterBuffer,S),C.webVideo)C.posterRId&&be.push({videoRId:"",mediaRId:"",videoTarget:"",posterRId:C.posterRId,posterTarget:C.posterRelativePath});else{let ce={videoRId:C.videoRId,mediaRId:C.mediaRId,videoTarget:C.relativePath};C.posterRId&&C.posterRelativePath&&(ce.posterRId=C.posterRId,ce.posterTarget=C.posterRelativePath),be.push(ce)}let Ye=[];if(U?.audioAssets)for(let C of U.audioAssets)this.zip.file(C.mediaPath,C.buffer,S),Ye.push({audioRId:C.audioRId,mediaRId:C.mediaRId,audioTarget:C.relativePath});let Ge=[];if(U?.svgAssets)for(let C of U.svgAssets)this.zip.file(C.svgMediaPath,C.svgBuffer,S),Ge.push({rId:C.svgRId,target:C.svgRelativePath});let dt=[];if(de)for(let C of de.charts){if(C.chartXml&&C.chartRelsXml&&C.excelBuffer&&C.rId){let ce=C.isChartEx?"chartEx":"chart";this.zip.file(`ppt/charts/${ce}${C.chartIndex}.xml`,C.chartXml,S),this.zip.file(`ppt/charts/_rels/${ce}${C.chartIndex}.xml.rels`,C.chartRelsXml,S),this.zip.file(`ppt/embeddings/${ce}${C.chartIndex}.xlsx`,C.excelBuffer,S),C.chartDrawingXml&&this.zip.file(`ppt/drawings/drawing${C.chartIndex}.xml`,C.chartDrawingXml,S),dt.push({rId:C.rId,target:`../charts/${ce}${C.chartIndex}.xml`,type:C.isChartEx?"chartEx":"chart"})}C.fallbackPng&&C.fallbackMediaPath&&(this.zip.file(C.fallbackMediaPath,C.fallbackPng,S),C.fallbackRId&&C.fallbackRelativePath&&xe.push({rId:C.fallbackRId,target:C.fallbackRelativePath}))}let Ve=v?.[R-1];Ve&&(this.zip.file(Ve.mediaPath,Ve.buffer,S),xe.push({rId:Ve.rId,target:Ve.relativePath}));let Ke=ge!==void 0&&ge!==""&&!(Array.isArray(ge)&&ge.length===0),ve=A?.find(C=>C.slideIndex===R-1),Re;if(k&&k.length>0&&x){let C=x[R-1],ce=this.masterLayoutMap;if(ce&&C){let bt=ce.get(C);bt&&(Re=`../slideLayouts/slideLayout${bt.firstLayoutIndex}.xml`)}if(!Re&&ce){let bt=x[R-1];ee().warn(`[zipper] Slide ${R}: master name "${bt??"(undefined)"}" not found in masterLayoutMap. Falling back to first master's first layout. Available masters: [${[...ce.keys()].join(", ")}]`);let br=ce.values().next().value;br&&(Re=`../slideLayouts/slideLayout${br.firstLayoutIndex}.xml`)}}let Ht=s[R-1]??"",ca=l[R-1]??"",pa=Ve?.rId,ma=f?Math.round(f.width*ie):void 0,da=f?Math.round(f.height*ie):void 0;if(this.zip.file(`ppt/slides/slide${R}.xml`,on(K,Ht,ca,Xe,fe,pa,ma,da,`slide:${R}`),S),this.zip.file(`ppt/slides/_rels/slide${R}.xml.rels`,dn(xe,$e,dt,Ke?R:void 0,Re,ve?.commentFileIndex,be,Ye,Ge),S),Ke){let C=pn(ge,R);this.zip.file(`ppt/notesSlides/notesSlide${R}.xml`,C.xml,S),this.zip.file(`ppt/notesSlides/_rels/notesSlide${R}.xml.rels`,fn(R,C.hyperlinkRels),S)}}this.shouldValidateOpcInvariants=!0}async generateBuffer(){return this.shouldValidateOpcInvariants&&await rn(this.zip),await this.zip.generateAsync({type:"nodebuffer",compression:"DEFLATE",compressionOptions:{level:6}})}generateStream(){return this.zip.generateNodeStream({type:"nodebuffer",compression:"DEFLATE",compressionOptions:{level:6},streamFiles:!0})}};function is(e){switch(e.type){case"moveTo":return`<a:moveTo><a:pt x="${e.x}" y="${e.y}"/></a:moveTo>`;case"lineTo":return`<a:lnTo><a:pt x="${e.x}" y="${e.y}"/></a:lnTo>`;case"cubicBezTo":return`<a:cubicBezTo><a:pt x="${e.cp1x}" y="${e.cp1y}"/><a:pt x="${e.cp2x}" y="${e.cp2y}"/><a:pt x="${e.x}" y="${e.y}"/></a:cubicBezTo>`;case"quadBezTo":return`<a:quadBezTo><a:pt x="${e.cpx}" y="${e.cpy}"/><a:pt x="${e.x}" y="${e.y}"/></a:quadBezTo>`;case"arcTo":return`<a:arcTo wR="${e.wR}" hR="${e.hR}" stAng="${e.stAng}" swAng="${e.swAng}"/>`;case"close":return"<a:close/>";default:return""}}function Fn(e){let t=`    <a:custGeom>
`;t+=`      <a:avLst/>
`,t+=`      <a:gdLst/>
`,t+=`      <a:ahLst/>
`,t+=`      <a:cxnLst/>
`,t+=`      <a:rect l="l" t="t" r="r" b="b"/>
`,t+=`      <a:pathLst>
`;for(let r of e.paths){let n=r.width??1e6,o=r.height??1e6,a=r.fill?` fill="${r.fill}"`:"";t+=`        <a:path w="${n}" h="${o}"${a}>`;for(let i of r.commands)t+=is(i);t+=`</a:path>
`}return t+=`      </a:pathLst>
`,t+=`    </a:custGeom>
`,t}var ls=.98;function cs(e){let t=[];return e.forEach((r,n)=>{n>0&&t.push({text:`
`}),t.push(...r.runs)}),t}function ps(e,t,r,n){if(n&&Number.isFinite(n.fontScale)&&Number.isFinite(n.lnSpcReduction))return n;let o=t?.textInsets,a=r.width-(o?.left??0)-(o?.right??0),i=r.height-(o?.top??0)-(o?.bottom??0);if(a<=0||i<=0)return;let s=cs(e);if(!(Ar(s,t,a).height<=i*ls))return Lr(s,t,a,i,{maxLines:t?.textFit?.maxLines})}function Et(e){let{paragraphs:t,textStyle:r,layout:n,existingAutoFitResult:o,requestedPolicy:a}=e;if(a==="none")return{policy:"none"};if(o&&Number.isFinite(o.fontScale)&&Number.isFinite(o.lnSpcReduction))return{policy:"shrink_text",autoFitResult:o};if(a==="engine_conditional"){let i=ps(t,r,n,o);return i?{policy:"shrink_text",autoFitResult:i}:{policy:"office_default"}}return a==="grow_shape"?{policy:"grow_shape"}:{policy:a??"office_default"}}function Bt(e){return e.policy==="shrink_text"&&e.autoFitResult?`<a:normAutofit fontScale="${e.autoFitResult.fontScale}" lnSpcReduction="${e.autoFitResult.lnSpcReduction}"/>`:e.policy==="office_default"||e.policy==="engine_conditional"?'<a:normAutofit fontScale="100000"/>':""}var ms=new Set(["rect","roundRect","ellipse","triangle","diamond","rightArrow","leftArrow","upArrow","downArrow","leftRightArrow","upDownArrow","star4","star5","star6","heart","cloud","hexagon","pentagon","octagon","parallelogram","trapezoid","flowChartProcess","flowChartDecision","flowChartTerminator","flowChartDocument","flowChartData","flowChartPredefinedProcess","wedgeRoundRectCallout","cloudCallout","rightBrace","leftBrace","rightBracket","leftBracket","mathPlus","mathMinus","mathMultiply","mathEqual","line","donut","frame","plaque"]),ds=new Set(["rect","ellipse","roundRect","triangle","rtTriangle","rightTriangle","diamond","parallelogram","trapezoid","nonIsoscelesTrapezoid","heart","plus","chevron","homePlate","donut","cloud","hexagon","pentagon","octagon","decagon","heptagon","dodecagon","snip1Rect","snip2SameRect","snip2DiagRect","snip2SameRect2","snipRoundRect","round1Rect","round2SameRect","round2DiagRect","round1Rect2","bevel","noSmoking","blockArc","pie","pieWedge","arc","chord","corner","diagStripe","halfFrame","frame","foldedCorner","can","cube","teardrop","gear6","gear9","plaque","smileyFace","irregularSeal1","irregularSeal2","ribbon","ribbon2","leftRightRibbon","lightningBolt","moon","sun","funnel","wave","doubleWave","ellipseRibbon","ellipseRibbon2","verticalScroll","horizontalScroll","line","lineInv","rightArrow","leftArrow","upArrow","downArrow","leftRightArrow","upDownArrow","bentArrow","uturnArrow","bentUpArrow","curvedRightArrow","curvedLeftArrow","curvedUpArrow","curvedDownArrow","stripedRightArrow","notchedRightArrow","circularArrow","leftCircularArrow","swooshArrow","leftRightUpArrow","quadArrow","leftUpArrow","quadArrowCallout","leftRightArrowCallout","upDownArrowCallout","leftArrowCallout","rightArrowCallout","upArrowCallout","downArrowCallout","flowChartProcess","flowChartDecision","flowChartDocument","flowChartTerminator","flowChartConnector","flowChartMerge","flowChartSort","flowChartExtract","flowChartPreparation","flowChartManualInput","flowChartManualOperation","flowChartPredefinedProcess","flowChartInternalStorage","flowChartMultidocument","flowChartOffpageConnector","flowChartPunchedTape","flowChartSummingJunction","flowChartOr","flowChartDelay","flowChartAlternateProcess","flowChartMagneticDisk","flowChartMagneticDrum","flowChartMagneticTape","flowChartDisplay","flowChartOnlineStorage","flowChartCollate","flowChartInputOutput","flowChartOfflineStorage","actionButtonBlank","actionButtonHome","actionButtonHelp","actionButtonInformation","actionButtonBackPrevious","actionButtonForwardNext","actionButtonBeginning","actionButtonEnd","actionButtonReturn","actionButtonSound","actionButtonMovie","wedgeRoundRectCallout","wedgeRectCallout","wedgeEllipseCallout","wedgeRoundRectCallout2","cloudCallout","borderCallout1","borderCallout2","borderCallout3","callout1","callout2","callout3","accentCallout1","accentCallout2","accentCallout3","accentBorderCallout1","accentBorderCallout2","accentBorderCallout3","mathPlus","mathMinus","mathMultiply","mathDivide","mathEqual","mathNotEqual","star4","star5","star6","star7","star8","star10","star12","star16","star24","star32","leftBrace","rightBrace","leftBracket","rightBracket","bracePair","bracketPair","plaqueTabs","squareTabs","roundTab","curvedConnector2","curvedConnector3","curvedConnector4","curvedConnector5","straightConnector1","bentConnector2","bentConnector3","bentConnector4","bentConnector5"]);function fs(e){if(!e)return`    <p:nvPr/>
`;let t=e.type?` type="${e.type}"`:"",r=e.idx!==void 0?` idx="${e.idx}"`:"";return`    <p:nvPr><p:ph${t}${r}/></p:nvPr>
`}function kn(e,t,r=200,n){let{x:o,y:a,width:i,height:s}=e.layout,l=Tr(e,i,s),p=l.shapeType||"rect",m=l.shapeAdjustments,c=e.placeholder,f=e._omitTransform,d=e.morphId,$=d?`!!${I(d)}`:`View ${t}`,g=e.style?.rotation,F=e.style?.flipH,P=e.style?.flipV,u=e.style?.opacity,X=e.textContent,D=e.textParagraphs,A=e.textStyle,T=X!==void 0||D&&D.length>0,G=[],k={current:r},x=e.hyperlink,v=e.altText,b=e.decorative,M=e.locks,_=l.customGeometry,q=l.shapeAdjustmentMap,w=`<p:sp>
`;w+=`  <p:nvSpPr>
`;let z=v?` descr="${I(v)}"`:"";if(x||b){let J="";if(x){let{hlinkXml:S}=It(x,G,k);S&&(J+=S)}b&&(J+=Se()),w+=`    <p:cNvPr id="${t}" name="${$}"${z}>${J}</p:cNvPr>
`}else w+=`    <p:cNvPr id="${t}" name="${$}"${z}/>
`;if(M?w+=`    <p:cNvSpPr>${Oe("a:spLocks",M)}</p:cNvSpPr>
`:w+=`    <p:cNvSpPr/>
`,w+=fs(c),w+=`  </p:nvSpPr>
`,w+=`  <p:spPr>
`,!tt(e.layout,f)){let J=[];g!==void 0&&g!==0&&J.push(`rot="${Math.round(g*6e4)}"`),F&&J.push('flipH="1"'),P&&J.push('flipV="1"');let S=J.length>0?" "+J.join(" "):"";w+=`    <a:xfrm${S}>
`,w+=`      <a:off x="${y(o)}" y="${y(a)}"/>
`,w+=`      <a:ext cx="${y(i)}" cy="${y(s)}"/>
`,w+=`    </a:xfrm>
`}if(_)w+=Fn(_);else{let J;if(Fe()&&!ms.has(p)?(ee().warn(`[shape] Shape "${p}" not supported in free mode \u2014 rendering as rectangle`),J="rect"):(J=ds.has(p)?p:"rect",J!==p&&ee().warn(`[shape] Invalid shapeType "${p}" \u2014 falling back to "rect"`)),w+=`    <a:prstGeom prst="${I(J)}">
`,q&&Object.keys(q).length>0){w+="      <a:avLst>";for(let[S,h]of Object.entries(q))w+=`<a:gd name="${I(S)}" fmla="val ${h}"/>`;w+=`</a:avLst>
`}else if(m&&m.length>0){w+="      <a:avLst>";for(let S=0;S<m.length;S++)w+=`<a:gd name="adj${S+1===1?"":S+1}" fmla="val ${m[S]}"/>`;w+=`</a:avLst>
`}else w+=`      <a:avLst/>
`;w+=`    </a:prstGeom>
`}let W=Dr(e.style,u,n);W?w+=`    ${W}
`:w+=`    <a:noFill/>
`,w+=`    ${Nr(e.style)}
`;let j=Xr(e.style);if(j&&(w+=`    ${j}
`),e.style?.effects?.scene3d&&(w+=`    ${_r(e.style.effects.scene3d)}
`),e.style?.effects?.sp3d&&(w+=`    ${zr(e.style.effects.sp3d)}
`),w+=`  </p:spPr>
`,w+=`  <p:txBody>
`,T&&A){let J=ke(X,D),S=Et({paragraphs:J,textStyle:A,layout:e.layout,existingAutoFitResult:e._autoFitResult,requestedPolicy:e._compatibility?.autoFitPolicy??"office_default"}),h=Bt(S),L=A.verticalAlign,B=A.textInsets,H=A.textDirection,V=['wrap="square"',`rtlCol="${A.rtl?"1":"0"}"`,'spcFirstLastPara="0"'];if(L&&V.push(`anchor="${Rt[L]||"t"}"`),B?(V.push(`lIns="${y(B.left??0)}"`),V.push(`tIns="${y(B.top??0)}"`),V.push(`rIns="${y(B.right??0)}"`),V.push(`bIns="${y(B.bottom??0)}"`)):V.push('lIns="0"','tIns="0"','rIns="0"','bIns="0"'),H==="vertical"?V.push('vert="vert270"'):H==="verticalEA"&&V.push('vert="eaVert"'),A.columns!==void 0&&A.columns>1&&(V.push(`numCol="${A.columns}"`),A.columnSpacing!==void 0&&V.push(`spcCol="${y(A.columnSpacing)}"`)),A.textWarp&&A.textWarp!=="textNoShape"){let ne=[`<a:prstTxWarp prst="${I(A.textWarp)}"><a:avLst/></a:prstTxWarp>`];h&&ne.push(h),w+=`    <a:bodyPr ${V.join(" ")}>${ne.join("")}</a:bodyPr>
`}else h?w+=`    <a:bodyPr ${V.join(" ")}>${h}</a:bodyPr>
`:w+=`    <a:bodyPr ${V.join(" ")}/>
`}else w+=`    <a:bodyPr rtlCol="0" lIns="0" tIns="0" rIns="0" bIns="0"/>
`;if(w+=`    <a:lstStyle/>
`,T){let J=ke(X,D);w+=Ae(J,A,G,k)}else w+=`    <a:p><a:endParaRPr lang="en-US" dirty="0"/></a:p>
`;return w+=`  </p:txBody>
`,w+=`</p:sp>
`,{xml:w,hyperlinkRels:G}}function hs(e,t,r){let n=e?.verticalAlign,o=e?.textInsets,a=e?.textDirection,i=e?.rtl,s=[`wrap="${r?"none":"square"}"`,`rtlCol="${i?"1":"0"}"`,'spcFirstLastPara="0"'];n&&s.push(`anchor="${Rt[n]||"t"}"`),o?(s.push(`lIns="${y(o.left??0)}"`),s.push(`tIns="${y(o.top??0)}"`),s.push(`rIns="${y(o.right??0)}"`),s.push(`bIns="${y(o.bottom??0)}"`)):s.push('lIns="0"','tIns="0"','rIns="0"','bIns="0"'),a==="vertical"?s.push('vert="vert270"'):a==="verticalEA"&&s.push('vert="eaVert"'),e?.columns!==void 0&&e.columns>1&&(s.push(`numCol="${e.columns}"`),e.columnSpacing!==void 0&&s.push(`spcCol="${y(e.columnSpacing)}"`));let l=s.join(" "),p=[];return!Fe()&&e?.textWarp&&e.textWarp!=="textNoShape"&&p.push(`<a:prstTxWarp prst="${I(e.textWarp)}"><a:avLst/></a:prstTxWarp>`),t&&p.push(t),p.length>0?`    <a:bodyPr ${l}>${p.join("")}</a:bodyPr>
`:`    <a:bodyPr ${l}/>
`}function sr(e,t,r=100){let{x:n,y:o,width:a,height:i}=e.layout,s=e.style,l=s?.backgroundColor,p=e._autoFitResult,m=e._insideVisualView,c=e.placeholder,f=e._omitTransform,d=e._singleLineShrinkWrappedWidth!==void 0&&Math.abs(e._singleLineShrinkWrappedWidth-a)<=1/64,$=[],g={current:r},F=Vr(e),P;if(Fe())P=m?"":'<a:normAutofit fontScale="100000"/>';else{let G=e.autoFit===!1?"none":e._compatibility?.autoFitPolicy??(m?"engine_conditional":"office_default"),k=Et({paragraphs:F,textStyle:s,layout:e.layout,existingAutoFitResult:p,requestedPolicy:G});P=Bt(k)}let u;if(c){let G=c.type?` type="${c.type}"`:"",k=c.idx!==void 0?` idx="${c.idx}"`:"";u=`    <p:nvPr><p:ph${G}${k}/></p:nvPr>
`}else u=`    <p:nvPr/>
`;let X=e.morphId,D=e.decorative,A=X?`!!${I(X)}`:`Text ${t}`,T=`<p:sp>
`;return T+=`  <p:nvSpPr>
`,D?T+=`    <p:cNvPr id="${t}" name="${A}">${Se()}</p:cNvPr>
`:T+=`    <p:cNvPr id="${t}" name="${A}"/>
`,T+=`    <p:cNvSpPr txBox="1"/>
`,T+=u,T+=`  </p:nvSpPr>
`,T+=`  <p:spPr>
`,tt(e.layout,f)||(T+=`    <a:xfrm>
`,T+=`      <a:off x="${y(n)}" y="${y(o)}"/>
`,T+=`      <a:ext cx="${y(a)}" cy="${y(i)}"/>
`,T+=`    </a:xfrm>
`),T+=`    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
`,l?(T+=`    <a:solidFill>
`,T+=`      ${se(l)}
`,T+=`    </a:solidFill>
`):T+=`    <a:noFill/>
`,T+=`    <a:ln><a:noFill/></a:ln>
`,T+=`  </p:spPr>
`,T+=`  <p:txBody>
`,T+=hs(s,P,d),T+=`    <a:lstStyle/>
`,T+=Ae(F,s,$,g),T+=`  </p:txBody>
`,T+=`</p:sp>
`,{xml:T,hyperlinkRels:$}}function An(e,t,r,n=200,o){let{x:a,y:i,width:s,height:l}=e.layout,{placeholder:p,_omitTransform:m,crop:c,borderRadius:f,altText:d,hyperlink:$,decorative:g,locks:F,imageEffects:P,morphId:u}=e,X=[],D;if(p){let b=p.type?` type="${p.type}"`:"",M=p.idx!==void 0?` idx="${p.idx}"`:"";D=`    <p:nvPr><p:ph${b}${M}/></p:nvPr>
`}else D=`    <p:nvPr/>
`;let A=u?`!!${I(u)}`:`Image ${t}`,T=d?` descr="${I(d)}"`:"",G="";if($){let b={current:n},{hlinkXml:M}=It($,X,b);M&&(G+=M)}g&&(G+=Se());let k=f&&f>0?"roundRect":"rect",x=`<p:pic>
`;if(x+=`  <p:nvPicPr>
`,G?x+=`    <p:cNvPr id="${t}" name="${A}"${T}>${G}</p:cNvPr>
`:x+=`    <p:cNvPr id="${t}" name="${A}"${T}/>
`,x+=`    <p:cNvPicPr>
`,x+=`      ${Oe("a:picLocks",F,{noGrp:!0,noChangeAspect:!0})}
`,x+=`    </p:cNvPicPr>
`,x+=D,x+=`  </p:nvPicPr>
`,x+=`  <p:blipFill>
`,x+=`    <a:blip r:embed="${r}">
`,P){if(P.brightness!==void 0||P.contrast!==void 0){let b=P.brightness!==void 0?` bright="${Math.round(P.brightness*1e3)}"`:"",M=P.contrast!==void 0?` contrast="${Math.round(P.contrast*1e3)}"`:"";x+=`      <a:lum${b}${M}/>
`}if(P.grayscale&&(x+=`      <a:grayscl/>
`),P.biLevel!==void 0&&(x+=`      <a:biLevel thresh="${P.biLevel}"/>
`),P.duotone&&(x+=`      <a:duotone>${se(P.duotone.color1)}${se(P.duotone.color2)}</a:duotone>
`),P.blur!==void 0){let b=y(P.blur);x+=`      <a:blur rad="${b}" grow="0"/>
`}}if(x+='      <a:extLst><a:ext uri="{28A0092B-C50C-407E-A947-70E740481C1C}"><a14:useLocalDpi xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" val="0"/></a:ext>',o&&(x+=`<a:ext uri="{96DAC541-7B7A-43D3-8B79-37D633B846F1}"><asvg:svgBlip xmlns:asvg="http://schemas.microsoft.com/office/drawing/2016/SVG/main" r:embed="${o}"/></a:ext>`),x+=`</a:extLst>
`,x+=`    </a:blip>
`,c&&(c.left||c.top||c.right||c.bottom)){let b=Math.min(1e5,Math.max(0,Math.round((c.left??0)*1e3))),M=Math.min(1e5,Math.max(0,Math.round((c.top??0)*1e3))),_=Math.min(1e5,Math.max(0,Math.round((c.right??0)*1e3))),q=Math.min(1e5,Math.max(0,Math.round((c.bottom??0)*1e3)));x+=`    <a:srcRect l="${b}" t="${M}" r="${_}" b="${q}"/>
`}if(x+=`    <a:stretch><a:fillRect/></a:stretch>
`,x+=`  </p:blipFill>
`,x+=`  <p:spPr>
`,tt(e.layout,m)||(x+=`    <a:xfrm>
`,x+=`      <a:off x="${y(a)}" y="${y(i)}"/>
`,x+=`      <a:ext cx="${y(s)}" cy="${y(l)}"/>
`,x+=`    </a:xfrm>
`),k==="roundRect"&&f){let b=Math.min(s,l),M=b>0?Math.round(f/b*5e4):16667;x+=`    <a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val ${M}"/></a:avLst></a:prstGeom>
`}else x+=`    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
`;return x+=`  </p:spPr>
`,x+=`</p:pic>
`,{xml:x,hyperlinkRels:X}}var us={top:"t",middle:"ctr",bottom:"b"};function st(e,t){let r=y(e.width??1),n=e.color??"#000000";return`<${t} w="${r}" cap="flat" cmpd="sng"><a:solidFill>${se(n)}</a:solidFill><a:prstDash val="solid"/></${t}>`}function gs(e,t,r,n,o,a){if(!a)return e.style;let i={};if(a.bandRow){let s=a.firstRow?1:0;if(t>=s){let l=t-s;l%2===0&&a.bandRowOddStyle?i={...i,...a.bandRowOddStyle}:l%2===1&&a.bandRowEvenStyle&&(i={...i,...a.bandRowEvenStyle})}}if(a.firstRow&&t===0&&a.headerRowStyle&&(i={...i,...a.headerRowStyle}),a.lastRow&&t===n-1&&a.footerRowStyle&&(i={...i,...a.footerRowStyle}),a.firstCol&&r===0&&a.firstColStyle&&(i={...i,...a.firstColStyle}),a.lastCol&&r===o-1&&a.lastColStyle&&(i={...i,...a.lastColStyle}),a.outerBorder||a.innerBorderH||a.innerBorderV){let s={...i.borders};a.outerBorder&&(t===0&&(s.top=s.top??a.outerBorder),t===n-1&&(s.bottom=s.bottom??a.outerBorder),r===0&&(s.left=s.left??a.outerBorder),r===o-1&&(s.right=s.right??a.outerBorder)),a.innerBorderH&&(t>0&&(s.top=s.top??a.innerBorderH),t<n-1&&(s.bottom=s.bottom??a.innerBorderH)),a.innerBorderV&&(r>0&&(s.left=s.left??a.innerBorderV),r<o-1&&(s.right=s.right??a.innerBorderV)),Object.keys(s).length>0&&(i.borders=s)}return e.style&&(i={...i,...e.style},e.style.borders&&(i.borders={...i.borders,...e.style.borders})),Object.keys(i).length>0?i:void 0}function xs(e){if(!e)return`            <a:tcPr/>
`;let t=[];if(e.verticalAlign&&t.push(`anchor="${us[e.verticalAlign]||"t"}"`),e.textDirection&&e.textDirection!=="horizontal"){let i={vertical:"vert270",verticalEA:"eaVert"};t.push(`vert="${i[e.textDirection]}"`)}if(e.padding!==void 0){let i=y(e.padding);t.push(`marL="${i}" marR="${i}" marT="${i}" marB="${i}"`)}let r=t.length>0?" "+t.join(" "):"",n=e.borders&&(e.borders.top||e.borders.right||e.borders.bottom||e.borders.left||e.borders.diagonalDown||e.borders.diagonalUp),o=e.fill!==void 0;if(!n&&!o)return`            <a:tcPr${r}/>
`;let a=`            <a:tcPr${r}>
`;if(e.borders&&(e.borders.left&&(a+=`              ${st(e.borders.left,"a:lnL")}
`),e.borders.right&&(a+=`              ${st(e.borders.right,"a:lnR")}
`),e.borders.top&&(a+=`              ${st(e.borders.top,"a:lnT")}
`),e.borders.bottom&&(a+=`              ${st(e.borders.bottom,"a:lnB")}
`),e.borders.diagonalDown&&(a+=`              ${st(e.borders.diagonalDown,"a:lnTlToBr")}
`),e.borders.diagonalUp&&(a+=`              ${st(e.borders.diagonalUp,"a:lnBlToTr")}
`)),e.fill!==void 0)if(typeof e.fill=="object"&&"type"in e.fill){let i=e.fill;a+="              <a:gradFill><a:gsLst>";for(let s of i.stops){let l=Math.min(1e5,Math.max(0,Math.round(s.position*1e3)));a+=`<a:gs pos="${l}">${s.alpha!==void 0?Br(s.color,s.alpha):se(s.color)}</a:gs>`}if(a+="</a:gsLst>",i.type==="linear"){let s=wt(i.angle??180);a+=`<a:lin ang="${s}" scaled="1"/>`}else a+='<a:path path="circle"><a:fillToRect l="50000" t="50000" r="50000" b="50000"/></a:path>';a+=`</a:gradFill>
`}else a+=`              <a:solidFill>${se(e.fill)}</a:solidFill>
`;return a+=`            </a:tcPr>
`,a}function ys(e,t,r,n){let o=n??e.style,a=o?.rtl?"1":"0",i=o?{fontSize:o.fontSize,fontFamily:o.fontFamily,fontFallback:o.fontFallback,fontWeight:o.fontWeight,fontStyle:o.fontStyle,color:o.color,textAlign:o.textAlign,rtl:o.rtl,lang:o.lang}:void 0;if(e.paragraphs||e.content){let m=ke(e.content,e.paragraphs),c=`            <a:txBody>
`;return c+=`              <a:bodyPr rtlCol="${a}" lIns="0" tIns="0" rIns="0" bIns="0"/><a:lstStyle/>
`,c+=Ae(m,i,t,r),c+=`            </a:txBody>
`,c}let s=e.text??"",l=ke([{text:s}],void 0).map(m=>({...m,align:o?.textAlign,rtl:o?.rtl})),p=`            <a:txBody>
`;return p+=`              <a:bodyPr rtlCol="${a}" lIns="0" tIns="0" rIns="0" bIns="0"/><a:lstStyle/>
`,p+=Ae(l,i,t,r),p+=`            </a:txBody>
`,p}function Ln(e,t,r=200){let{x:n,y:o,width:a,height:i}=e.layout,s=e.tableData,l=s?Er(s,a,i):void 0,p=l?Math.max(i,l.totalAssignedHeight):i,m=s?Mr(s,a):[],c=s?.rows??[],f=e.morphId,d=f?`!!${I(f)}`:`Table ${t}`,$=e.altText,g=[],F={current:r},P=`<p:graphicFrame>
`;P+=`  <p:nvGraphicFramePr>
`;let u=$?` descr="${I($)}"`:"";P+=`    <p:cNvPr id="${t}" name="${d}"${u}/>
`,P+=`    <p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr>
`,P+=`    <p:nvPr/>
`,P+=`  </p:nvGraphicFramePr>
`,P+=`  <p:xfrm>
`,P+=`    <a:off x="${y(n)}" y="${y(o)}"/>
`,P+=`    <a:ext cx="${y(a)}" cy="${y(p)}"/>
`,P+=`  </p:xfrm>
`,P+=`  <a:graphic>
`,P+=`    <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">
`,P+=`      <a:tbl>
`;let X=s?.style,D=[];X?.firstRow?D.push('firstRow="1"'):D.push('firstRow="0"'),X?.lastRow&&D.push('lastRow="1"'),X?.firstCol&&D.push('firstCol="1"'),X?.lastCol&&D.push('lastCol="1"'),X?.bandRow?D.push('bandRow="1"'):D.push('bandRow="0"'),X?.bandCol&&D.push('bandCol="1"'),P+=`        <a:tblPr ${D.join(" ")}/>
`,P+=`        <a:tblGrid>
`;for(let A of m)P+=`          <a:gridCol w="${y(A)}"/>
`;P+=`        </a:tblGrid>
`,c.length===0&&(P+=`        <a:tr h="${y(30)}">
`,P+=`          <a:tc>
`,P+=`            <a:txBody>
`,P+=`              <a:bodyPr rtlCol="0" lIns="0" tIns="0" rIns="0" bIns="0"/><a:lstStyle/>
`,P+=`              <a:p><a:endParaRPr lang="en-US" dirty="0"/></a:p>
`,P+=`            </a:txBody>
`,P+=`            <a:tcPr/>
`,P+=`          </a:tc>
`,P+=`        </a:tr>
`);for(let A=0;A<c.length;A++){let T=c[A],G=l?.rows[A]?.assignedHeight??T.minHeight??T.height??30,k=y(Math.max(G,1));P+=`        <a:tr h="${k}">
`,T.cells.length!==m.length&&ee().warn(`[table] Row ${A} has ${T.cells.length} cells but table has ${m.length} columns \u2014 padding/truncating to match`);let x=Math.min(T.cells.length,m.length);for(let v=0;v<x;v++){let b=T.cells[v],M=gs(b,A,v,c.length,m.length,X),_=Fe(),q=(b.colSpan??1)>1||(b.rowSpan??1)>1||b.vMerge||b.hMerge;_&&q&&ee().warn(`[table] Merged table cells flattened in free mode (row ${A}, col ${v})`);let w=!_&&(b.colSpan??1)>1?` gridSpan="${b.colSpan}"`:"",z=!_&&(b.rowSpan??1)>1?` rowSpan="${b.rowSpan}"`:"",W=!_&&b.vMerge?' vMerge="1"':"",j=!_&&b.hMerge?' hMerge="1"':"";P+=`          <a:tc${w}${z}${W}${j}>
`,P+=ys(b,g,F,M),P+=xs(M),P+=`          </a:tc>
`}for(let v=x;v<m.length;v++)P+=`          <a:tc>
`,P+=`            <a:txBody>
`,P+=`              <a:bodyPr rtlCol="0" lIns="0" tIns="0" rIns="0" bIns="0"/><a:lstStyle/>
`,P+=`              <a:p><a:endParaRPr lang="en-US" dirty="0"/></a:p>
`,P+=`            </a:txBody>
`,P+=`            <a:tcPr/>
`,P+=`          </a:tc>
`;P+=`        </a:tr>
`}return P+=`      </a:tbl>
`,P+=`    </a:graphicData>
`,P+=`  </a:graphic>
`,P+=`</p:graphicFrame>
`,{xml:P,hyperlinkRels:g}}function Tn(e,t,r,n,o){let a=o?lr(e,t,r):ir(e,t,r),i=o?"cx":"c",s=o?'xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex"':'xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"',{x:l,y:p,width:m,height:c}=e.layout,f=t+1e5,d=`<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" ${s}>
`;return d+=`  <mc:Choice Requires="${i}">
`,d+=a,d+=`  </mc:Choice>
`,d+=`  <mc:Fallback>
`,d+=`    <p:pic>
`,d+=`      <p:nvPicPr>
`,d+=`        <p:cNvPr id="${f}" name="Chart Fallback"/>
`,d+=`        <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
`,d+=`        <p:nvPr/>
`,d+=`      </p:nvPicPr>
`,d+=`      <p:blipFill>
`,d+=`        <a:blip r:embed="${n}"/>
`,d+=`        <a:stretch><a:fillRect/></a:stretch>
`,d+=`      </p:blipFill>
`,d+=`      <p:spPr>
`,d+=`        <a:xfrm>
`,d+=`          <a:off x="${y(l)}" y="${y(p)}"/>
`,d+=`          <a:ext cx="${y(m)}" cy="${y(c)}"/>
`,d+=`        </a:xfrm>
`,d+=`        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
`,d+=`      </p:spPr>
`,d+=`    </p:pic>
`,d+=`  </mc:Fallback>
`,d+=`</mc:AlternateContent>
`,d}function or(e,t,r){let{x:n,y:o,width:a,height:i}=e.layout,s=`<p:pic>
`;return s+=`  <p:nvPicPr>
`,s+=`    <p:cNvPr id="${t}" name="Chart Fallback"/>
`,s+=`    <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
`,s+=`    <p:nvPr/>
`,s+=`  </p:nvPicPr>
`,s+=`  <p:blipFill>
`,s+=`    <a:blip r:embed="${r}"/>
`,s+=`    <a:stretch><a:fillRect/></a:stretch>
`,s+=`  </p:blipFill>
`,s+=`  <p:spPr>
`,s+=`    <a:xfrm>
`,s+=`      <a:off x="${y(n)}" y="${y(o)}"/>
`,s+=`      <a:ext cx="${y(a)}" cy="${y(i)}"/>
`,s+=`    </a:xfrm>
`,s+=`    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
`,s+=`  </p:spPr>
`,s+=`</p:pic>
`,s}function ir(e,t,r){let{x:n,y:o,width:a,height:i}=e.layout,s=e.morphId,l=s?`!!${I(s)}`:`Chart ${t}`,p=e.altText,m=`<p:graphicFrame>
`;m+=`  <p:nvGraphicFramePr>
`;let c=p?` descr="${I(p)}"`:"";return m+=`    <p:cNvPr id="${t}" name="${l}"${c}/>
`,m+=`    <p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr>
`,m+=`    <p:nvPr/>
`,m+=`  </p:nvGraphicFramePr>
`,m+=`  <p:xfrm>
`,m+=`    <a:off x="${y(n)}" y="${y(o)}"/>
`,m+=`    <a:ext cx="${y(a)}" cy="${y(i)}"/>
`,m+=`  </p:xfrm>
`,m+=`  <a:graphic>
`,m+=`    <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
`,m+=`      <c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="${r}"/>
`,m+=`    </a:graphicData>
`,m+=`  </a:graphic>
`,m+=`</p:graphicFrame>
`,m}function lr(e,t,r){let{x:n,y:o,width:a,height:i}=e.layout,s=e.morphId,l=s?`!!${I(s)}`:`Chart ${t}`,p=e.altText,m=`<p:graphicFrame>
`;m+=`  <p:nvGraphicFramePr>
`;let c=p?` descr="${I(p)}"`:"";return m+=`    <p:cNvPr id="${t}" name="${l}"${c}/>
`,m+=`    <p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr>
`,m+=`    <p:nvPr/>
`,m+=`  </p:nvGraphicFramePr>
`,m+=`  <p:xfrm>
`,m+=`    <a:off x="${y(n)}" y="${y(o)}"/>
`,m+=`    <a:ext cx="${y(a)}" cy="${y(i)}"/>
`,m+=`  </p:xfrm>
`,m+=`  <a:graphic>
`,m+=`    <a:graphicData uri="http://schemas.microsoft.com/office/drawing/2014/chartex">
`,m+=`      <cx:chart xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="${r}"/>
`,m+=`    </a:graphicData>
`,m+=`  </a:graphic>
`,m+=`</p:graphicFrame>
`,m}var vs={straight:"line",elbow:"bentConnector3",curved:"curvedConnector3"};function cr(e,t){let{start:r,end:n,connectorType:o,arrowStart:a,arrowEnd:i}=e,s=e.morphId,l=s?`!!${I(s)}`:`Connector ${t}`,p=Math.min(r.x,n.x),m=Math.min(r.y,n.y),c=Math.max(r.x,n.x),f=Math.max(r.y,n.y),d=c-p||1,$=f-m||1,g=n.x<r.x,F=n.y<r.y,P=vs[o]??"line",u=e.lineWidth??1,X=e.lineColor??"#000000",D=e.lineDashStyle,A=[];g&&A.push('flipH="1"'),F&&A.push('flipV="1"');let T=A.length>0?" "+A.join(" "):"",G=e.altText,k=e.decorative,x=e.locks,v=`<p:cxnSp>
`;v+=`  <p:nvCxnSpPr>
`;let b=G?` descr="${I(G)}"`:"";k?v+=`    <p:cNvPr id="${t}" name="${l}"${b}>${Se()}</p:cNvPr>
`:v+=`    <p:cNvPr id="${t}" name="${l}"${b}/>
`;let M=e.startShape!==void 0,_=e.endShape!==void 0,q=x!==void 0;M||_||q?(v+="    <p:cNvCxnSpPr>",q&&(v+=Oe("a:cxnSpLocks",x)),M&&(v+=`<a:stCxn id="${e.startShape.shapeId}" idx="${e.startShape.site??0}"/>`),_&&(v+=`<a:endCxn id="${e.endShape.shapeId}" idx="${e.endShape.site??0}"/>`),v+=`</p:cNvCxnSpPr>
`):v+=`    <p:cNvCxnSpPr/>
`,v+=`    <p:nvPr/>
`,v+=`  </p:nvCxnSpPr>
`,v+=`  <p:spPr>
`,v+=`    <a:xfrm${T}>
`,v+=`      <a:off x="${y(p)}" y="${y(m)}"/>
`,v+=`      <a:ext cx="${y(d)}" cy="${y($)}"/>
`,v+=`    </a:xfrm>
`,v+=`    <a:prstGeom prst="${I(P)}"><a:avLst/></a:prstGeom>
`;let w=y(u);if(v+=`    <a:ln w="${w}">
`,v+=`      <a:solidFill>${se(X)}</a:solidFill>
`,D&&D!=="solid"&&(v+=`      <a:prstDash val="${{dashed:"dash",dotted:"dot",dotDash:"dashDot"}[D]||"solid"}"/>
`),a)if(typeof a=="object"){let z=a,W=z.width?` w="${I(z.width)}"`:"",j=z.length?` len="${I(z.length)}"`:"";v+=`      <a:headEnd type="${I(z.type)}"${W}${j}/>
`}else v+=`      <a:headEnd type="triangle"/>
`;if(i)if(typeof i=="object"){let z=i,W=z.width?` w="${I(z.width)}"`:"",j=z.length?` len="${I(z.length)}"`:"";v+=`      <a:tailEnd type="${I(z.type)}"${W}${j}/>
`}else v+=`      <a:tailEnd type="triangle"/>
`;return v+=`    </a:ln>
`,v+=`  </p:spPr>
`,v+=`</p:cxnSp>
`,v}function Mn(e,t,r,n){let{x:o,y:a,width:i,height:s}=e.layout,l=`Web Video ${t}`,p=e.altText?` descr="${I(e.altText)}"`:"",m=t+1e5,c=`<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">
`;return c+=`  <mc:Choice Requires="we">
`,c+=`    <p:pic>
`,c+=`      <p:nvPicPr>
`,c+=`        <p:cNvPr id="${t}" name="${l}"${p}>
`,c+=`          <a:hlinkClick r:id="${r.hyperlinkRId}"/>
`,c+=`        </p:cNvPr>
`,c+=`        <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
`,c+=`        <p:nvPr>
`,c+=`          <p:extLst>
`,c+=`            <p:ext uri="{C183D7F6-B498-43B3-948B-1728B52AA6E4}">
`,c+=`              <we:webextension xmlns:we="http://schemas.microsoft.com/office/webextensions/webextension/2010/11">
`,c+=`                <we:webvideo h="${y(s)}" w="${y(i)}" src="${I(r.embedUrl)}"/>
`,c+=`              </we:webextension>
`,c+=`            </p:ext>
`,c+=`          </p:extLst>
`,c+=`        </p:nvPr>
`,c+=`      </p:nvPicPr>
`,c+=`      <p:blipFill>
`,c+=n?`        <a:blip r:embed="${n}"/>
`:`        <a:blip/>
`,c+=`        <a:stretch><a:fillRect/></a:stretch>
`,c+=`      </p:blipFill>
`,c+=`      <p:spPr>
`,c+=`        <a:xfrm><a:off x="${y(o)}" y="${y(a)}"/><a:ext cx="${y(i)}" cy="${y(s)}"/></a:xfrm>
`,c+=`        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
`,c+=`      </p:spPr>
`,c+=`    </p:pic>
`,c+=`  </mc:Choice>
`,c+=`  <mc:Fallback>
`,c+=`    <p:pic>
`,c+=`      <p:nvPicPr>
`,c+=`        <p:cNvPr id="${m}" name="Video Fallback">
`,c+=`          <a:hlinkClick r:id="${r.hyperlinkRId}"/>
`,c+=`        </p:cNvPr>
`,c+=`        <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
`,c+=`        <p:nvPr/>
`,c+=`      </p:nvPicPr>
`,c+=`      <p:blipFill>
`,c+=n?`        <a:blip r:embed="${n}"/>
`:`        <a:blip/>
`,c+=`        <a:stretch><a:fillRect/></a:stretch>
`,c+=`      </p:blipFill>
`,c+=`      <p:spPr>
`,c+=`        <a:xfrm><a:off x="${y(o)}" y="${y(a)}"/><a:ext cx="${y(i)}" cy="${y(s)}"/></a:xfrm>
`,c+=`        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
`,c+=`      </p:spPr>
`,c+=`    </p:pic>
`,c+=`  </mc:Fallback>
`,c+=`</mc:AlternateContent>
`,c}function En(e,t,r){return{...e,layout:{...e.layout,x:e.layout.x-t,y:e.layout.y-r},children:e.children?e.children.map(n=>En(n,t,r)):void 0}}function Ps(e,t){let r=0;for(let n of e){if(n.webVideo){r+=1,n.posterRId&&(r+=1);continue}r+=2,n.posterRId&&(r+=1)}return r+t.length*2}function $s(e,t,r){if(e.length>0)return e.reduce((o,a)=>{let i=o;return a.rId&&(i+=1),a.fallbackRId&&(i+=1),i},0);let n=0;for(let o of t)o&&(n+=1);for(let o of r)o&&(n+=1);return n}function bs(e){let t=Ps(e.videoMediaInfo,e.audioMediaInfo);return 2+e.mediaRIds.length+e.fillMediaRIds.length+t+e.svgRIds.length+$s(e.chartAssets,e.chartRIds,e.chartFallbackRIds)}function sl(e,t={}){let r=t.idCounter??{current:2},n=t.mediaRIds??[],o=t.imageCounter??{current:0},a=t.chartRIds??[],i=t.chartCounter??{current:0},s=t.fillMediaRIds??[],l=t.fillImageCounter??{current:0},p=t.videoMediaInfo??[],m=t.videoCounter??{current:0},c=t.audioMediaInfo??[],f=t.audioCounter??{current:0},d=t.chartAssets??[],$=t.chartFallbackRIds??[],g=t.svgRIds??[],F=t.svgCounter??{current:0},P=t.hyperlinkRIdStart??bs({mediaRIds:n,fillMediaRIds:s,videoMediaInfo:p,audioMediaInfo:c,chartAssets:d,chartRIds:a,chartFallbackRIds:$,svgRIds:g}),u="",X=[],D=P,A=[],T=[],G=[],k=new Set;function x(h){if(h.type==="Text"){let L=ke(h.content,h.paragraphs);return{kind:"text",textTarget:{paragraphCount:L.length,paragraphLevels:L.map(B=>B.level??0)}}}if(h.type==="View"&&(h.textContent!==void 0||h.textParagraphs&&h.textParagraphs.length>0)){let L=ke(h.textContent,h.textParagraphs);return{kind:"text",textTarget:{paragraphCount:L.length,paragraphLevels:L.map(B=>B.level??0)}}}return{kind:"shape"}}function v(h,L){k.add(L);let B=x(h);if("animations"in h&&h.animations)for(let H of h.animations)A.push({shapeId:L,effect:H.effect,animation:H,target:B});if("animationGroups"in h&&h.animationGroups)for(let H of h.animationGroups)for(let Y of H.animations){let V={...Y,trigger:Y.trigger??H.trigger??"onClick"};A.push({shapeId:L,effect:V.effect,animation:V,target:B})}}function b(h){if(Kt(h)){let L=r.current++,B;if(h.style?.fill?.type==="image"){let V=l.current++;B=s[V],B===void 0&&ee().warn(`[orchestrator] Image fill rId out of bounds: index ${V} >= fillMediaRIds.length ${s.length}`)}let Y=kn(h,L,D,B);u+=Y.xml,X.push(...Y.hyperlinkRels),D+=Y.hyperlinkRels.length,v(h,L)}if(h.children){let L=Kt(h)||h._insideVisualView;for(let B of h.children)L&&(B._insideVisualView=!0),S(B)}}function M(h){let L=r.current++,B=sr(h,L,D);u+=B.xml,X.push(...B.hyperlinkRels),D+=B.hyperlinkRels.length,v(h,L)}function _(h){let L=o.current++,B=n[L];if(B===void 0&&n.length>0&&ee().warn(`[orchestrator] Image rId out of bounds: index ${L} >= mediaRIds.length ${n.length}`),B!==void 0){let H=r.current++,Y=h.svgSrc?F.current++:-1;Y>=0&&Y>=g.length&&ee().warn(`[orchestrator] SVG rId out of bounds: index ${Y} >= svgRIds.length ${g.length}`);let V=Y>=0?g[Y]:void 0,ne=An(h,H,B,D,V);u+=ne.xml,X.push(...ne.hyperlinkRels),D+=ne.hyperlinkRels.length,v(h,H)}}function q(h){let L=r.current++,B=Ln(h,L,D);u+=B.xml,X.push(...B.hyperlinkRels),D+=B.hyperlinkRels.length,v(h,L)}function w(h){let L=i.current++,B=d[L],H=B?.rId??a[L];H===void 0&&a.length>0&&B?.renderMode!=="image-only"&&ee().warn(`[orchestrator] Chart rId out of bounds: index ${L} >= chartRIds.length ${a.length}`);let Y=B?.fallbackRId??$[L],V=B?.isChartEx??Je(h.chartData.chartType),ne=B?.renderMode,ye=h._compatibility?.mode==="visual_fallback"||ne==="image-only";if(H!==void 0||Y!==void 0){let oe=r.current++;ye&&Y?u+=or(h,oe,Y):Y&&H?u+=Tn(h,oe,H,Y,V):H&&V?u+=lr(h,oe,H):H?u+=ir(h,oe,H):Y&&(u+=or(h,oe,Y)),v(h,oe);let R=Ur(h.chartData,{x:h.layout.x,y:h.layout.y,width:h.layout.width,height:h.layout.height});for(let U of R.connectors){let de=r.current++;u+=cr(U,de)}for(let U of R.labels){let de=r.current++,$e=U.style,Xe={x:$e?.left??h.layout.x,y:$e?.top??h.layout.y,width:$e?.width??0,height:$e?.height??0},ge={...U,layout:Xe},fe=sr(ge,de,D);u+=fe.xml,X.push(...fe.hyperlinkRels),D+=fe.hyperlinkRels.length}let K=h.chartAnimation;if(K){let U=K.effect??"appear";A.push({shapeId:oe,effect:U,animation:{trigger:K.trigger??"onClick",effect:U,duration:K.duration??500,type:"entrance"},target:{kind:"shape"}})}}}function z(h){let L=r.current++;u+=cr(h,L),v(h,L)}function W(h){let{x:L,y:B,width:H,height:Y}=h.layout,V=r.current++,ne=h.morphId,ye=ne?`!!${I(ne)}`:`Group ${V}`,oe=h.altText,R=h.decorative,K=h.locks;u+=`<p:grpSp>
`,u+=`  <p:nvGrpSpPr>
`;let U=oe?` descr="${I(oe)}"`:"";if(R?u+=`    <p:cNvPr id="${V}" name="${ye}"${U}>${Se()}</p:cNvPr>
`:u+=`    <p:cNvPr id="${V}" name="${ye}"${U}/>
`,u+=`    <p:cNvGrpSpPr>${Oe("a:grpSpLocks",K,{noGrp:!0})}</p:cNvGrpSpPr>
`,u+=`    <p:nvPr/>
`,u+=`  </p:nvGrpSpPr>
`,u+=`  <p:grpSpPr>
`,u+=`    <a:xfrm>
`,u+=`      <a:off x="${y(L)}" y="${y(B)}"/>
`,u+=`      <a:ext cx="${y(H)}" cy="${y(Y)}"/>
`,u+=`      <a:chOff x="0" y="0"/>
`,u+=`      <a:chExt cx="${y(H)}" cy="${y(Y)}"/>
`,u+=`    </a:xfrm>
`,u+=`  </p:grpSpPr>
`,v(h,V),h.children)for(let de of h.children)S(En(de,L,B));u+=`</p:grpSp>
`}function j(h){let L=h.type==="Video",B=L?p[m.current++]:c[f.current++],H=r.current++,{x:Y,y:V,width:ne,height:ye}=h.layout,oe=h.altText,R=oe?` descr="${I(oe)}"`:"",K=`${h.type} ${H}`,U=h.playback,de=L?B?.webVideo:void 0;if(L&&de)u+=Mn(h,H,de,B.posterRId);else if(B){let $e=L?B.videoRId:B.audioRId,Xe=B.mediaRId,ge=L?B.posterRId:void 0;u+=`<p:pic>
`,u+=`  <p:nvPicPr>
`,u+=`    <p:cNvPr id="${H}" name="${K}"${R}>
`,u+=`      <a:hlinkClick r:id="" action="ppaction://media"/>
`,u+=`    </p:cNvPr>
`,u+=`    <p:cNvPicPr>
`,u+=`      <a:picLocks noChangeAspect="1"/>
`,u+=`    </p:cNvPicPr>
`,u+=`    <p:nvPr>
`,u+=`      <a:${L?"video":"audio"}File r:link="${$e}"/>
`,u+=`      <p:extLst>
`,u+=`        <p:ext uri="{DAA4B4D4-6D71-4841-9C94-3DE7FCFB9230}">
`,U&&(U.trimStart!==void 0||U.trimEnd!==void 0)?(u+=`          <p14:media xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" r:embed="${Xe}">`,u+=`<p14:trim st="${U.trimStart??0}" end="${U.trimEnd??0}"/>`,u+=`</p14:media>
`):u+=`          <p14:media xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" r:embed="${Xe}"/>
`,u+=`        </p:ext>
`,u+=`      </p:extLst>
`,u+=`    </p:nvPr>
`,u+=`  </p:nvPicPr>
`,u+=`  <p:blipFill>
`,u+=ge?`    <a:blip r:embed="${ge}"/>
`:`    <a:blip/>
`,u+=`    <a:stretch><a:fillRect/></a:stretch>
`,u+=`  </p:blipFill>
`,u+=`  <p:spPr>
`,u+=`    <a:xfrm>
`;let xe=!L&&h.icon==="none"?0:ne,be=!L&&h.icon==="none"?0:ye;u+=`      <a:off x="${y(Y)}" y="${y(V)}"/>
`,u+=`      <a:ext cx="${y(xe)}" cy="${y(be)}"/>
`,u+=`    </a:xfrm>
`,u+=`    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
`,u+=`  </p:spPr>
`,u+=`</p:pic>
`,U&&G.push({shapeId:H,mediaType:L?"video":"audio",playback:U,playAcrossSlides:L?void 0:h.playAcrossSlides})}else u+=`<p:sp>
`,u+=`  <p:nvSpPr>
`,u+=`    <p:cNvPr id="${H}" name="${K}"${R}/>
`,u+=`    <p:cNvSpPr/>
`,u+=`    <p:nvPr/>
`,u+=`  </p:nvSpPr>
`,u+=`  <p:spPr>
`,u+=`    <a:xfrm><a:off x="${y(Y)}" y="${y(V)}"/><a:ext cx="${y(ne)}" cy="${y(ye)}"/></a:xfrm>
`,u+=`    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
`,u+=`    <a:noFill/>
`,u+=`    <a:ln><a:noFill/><a:round/></a:ln>
`,u+=`  </p:spPr>
`,u+=`  <p:txBody>
`,u+=`    <a:bodyPr rtlCol="0"/>
`,u+=`    <a:lstStyle/>
`,u+=`    <a:p><a:endParaRPr lang="en-US" dirty="0"/></a:p>
`,u+=`  </p:txBody>
`,u+=`</p:sp>
`;v(h,H)}let J={View:h=>b(h),Slide:h=>b(h),Text:h=>M(h),Image:h=>_(h),Table:h=>q(h),Chart:h=>w(h),Connector:h=>z(h),Group:h=>W(h),Video:h=>j(h),Audio:h=>j(h)};function S(h){if(h.style?.display==="none")return;let L=J[h.type];if(L){L(h);return}ee().warn(`[orchestrator] UNKNOWN_NODE_TYPE: no serializer registered for node.type="${h.type}". Node was dropped from slide XML.`)}return S(e),{xml:u,hyperlinkRels:X,animationManifest:A,chartBuildEntries:T,mediaPlaybackEntries:G,emittedShapeIds:k}}function Dt(e,t=0){return Number.isFinite(e)?e:t}function Bn(e,t){let r=e;return t.min!==void 0&&(r=Math.max(t.min,r)),t.max!==void 0&&(r=Math.min(t.max,r)),r}function Cs(e,t){return e.toFixed(t).replace(/\.?0+$/,"")}function Dn(e,t={}){let r=Math.round(Dt(e,t.fallback));return String(Bn(r,t))}function vt(e,t={}){return Dn(e,{...t,min:Math.max(0,t.min??0)})}function we(e){return e?"1":"0"}function Te(e){let t=Bn(Dt(e,0),{min:0,max:1});return Cs(t,4)}function he(e,t=10){return vt(Dt(e,t)*75,{min:1})}function Nn(e,t=0){return Dn(Dt(e,t)*6e4)}var me=["4472C4","ED7D31","A9D18E","FFC000","5B9BD5","70AD47","264478","9B57A0"],le="111111111",ue="222222222",ot="333333333",it="444444444",Pt="555555555",pr="666666666";function Z(e){let t="",r=e;for(;r>=0;)t=String.fromCharCode(65+r%26)+t,r=Math.floor(r/26)-1;return t}function mr(e){if(!e)return"";let t="";return e.major!==!1&&(e.color?t+=`        <c:majorGridlines><c:spPr><a:ln><a:solidFill><a:srgbClr val="${O(e.color)}"/></a:solidFill></a:ln></c:spPr></c:majorGridlines>
`:t+=`        <c:majorGridlines/>
`),e.minor&&(t+=`        <c:minorGridlines/>
`),t}function lt(e){if(!e)return"";let t="";return e.tickMark?.major&&(t+=`        <c:majorTickMark val="${e.tickMark.major}"/>
`),e.tickMark?.minor&&(t+=`        <c:minorTickMark val="${e.tickMark.minor}"/>
`),t}function ct(e){if(!e||!e.labelFont&&e.labelRotation===void 0)return"";let t=he(e.labelFont?.fontSize??10,10),r=e.labelFont?.fontFamily??"Calibri",n=e.labelRotation!==void 0?Nn(e.labelRotation):"0",o="";e.labelFont?.fontColor&&(o=`<a:solidFill><a:srgbClr val="${O(e.labelFont.fontColor)}"/></a:solidFill>`);let a=e.labelFont?.bold?' b="1"':"",i=e.labelFont?.italic?' i="1"':"",s=`        <c:txPr>
`;return s+=`          <a:bodyPr rot="${n}"/>
`,s+=`          <a:lstStyle/>
`,s+=`          <a:p>
`,s+=`            <a:pPr><a:defRPr sz="${t}"${a}${i}>${o}<a:latin typeface="${I(r)}"/></a:defRPr></a:pPr>
`,s+=`            <a:endParaRPr lang="en-US" dirty="0"/>
`,s+=`          </a:p>
`,s+=`        </c:txPr>
`,s}function pt(e){return!e||e.crossesAt===void 0?"":`        <c:crossesAt val="${e.crossesAt}"/>
`}function Nt(e,t){let r=`        <c:scaling>
`;return r+=`          <c:orientation val="minMax"/>
`,t!==void 0&&(r+=`          <c:max val="${t}"/>
`),e!==void 0&&(r+=`          <c:min val="${e}"/>
`),r+=`        </c:scaling>
`,r}function Ss(e){return`        <c:scaling><c:orientation val="${e.chartType==="radar"?"maxMin":"minMax"}"/></c:scaling>
`}function _n(e){let t=e.categoryAxis,n=t?.visible!==!1?"0":"1",o=`      <c:valAx>
`;return o+=`        <c:axId val="${ot}"/>
`,o+=Nt(t?.min,t?.max),o+=`        <c:delete val="${n}"/>
`,o+=`        <c:axPos val="b"/>
`,t?.title&&(o+=mt(t.title,t.fontFamily,t.fontSize,t.fontColor)),t?.numberFormat?o+=`        <c:numFmt formatCode="${E(t.numberFormat)}" sourceLinked="0"/>
`:o+=`        <c:numFmt formatCode="General" sourceLinked="1"/>
`,o+=lt(t),t?.tickMark?.major||(o+=`        <c:majorTickMark val="out"/>
`),t?.tickMark?.minor||(o+=`        <c:minorTickMark val="none"/>
`),o+=`        <c:tickLblPos val="nextTo"/>
`,o+=`        <c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>
`,o+=ct(t),o+=`        <c:crossAx val="${it}"/>
`,o+=pt(t),t?.crossesAt||(o+=`        <c:crosses val="autoZero"/>
`),o+=`      </c:valAx>
`,o}function zn(e){let t=e.valueAxis,n=t?.visible!==!1?"0":"1",o=`      <c:valAx>
`;return o+=`        <c:axId val="${it}"/>
`,o+=Nt(t?.min,t?.max),o+=`        <c:delete val="${n}"/>
`,o+=`        <c:axPos val="l"/>
`,t?.gridlines?o+=mr(t.gridlines):o+=`        <c:majorGridlines/>
`,t?.title&&(o+=mt(t.title,t.fontFamily,t.fontSize,t.fontColor)),t?.numberFormat?o+=`        <c:numFmt formatCode="${E(t.numberFormat)}" sourceLinked="0"/>
`:o+=`        <c:numFmt formatCode="General" sourceLinked="1"/>
`,o+=lt(t),t?.tickMark?.major||(o+=`        <c:majorTickMark val="out"/>
`),t?.tickMark?.minor||(o+=`        <c:minorTickMark val="none"/>
`),o+=`        <c:tickLblPos val="nextTo"/>
`,o+=`        <c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>
`,o+=ct(t),o+=`        <c:crossAx val="${ot}"/>
`,o+=pt(t),t?.crossesAt||(o+=`        <c:crosses val="autoZero"/>
`),o+=`      </c:valAx>
`,o}function Xn(e,t){let r=e.secondaryCategoryAxis??e.categoryAxis,o=r?.visible??!1?"0":"1",a=t==="bar"?"r":"t",i=`      <c:catAx>
`;return i+=`        <c:axId val="${pr}"/>
`,i+=`        <c:scaling><c:orientation val="minMax"/></c:scaling>
`,i+=`        <c:delete val="${o}"/>
`,i+=`        <c:axPos val="${a}"/>
`,r?.title&&(i+=mt(r.title,r.fontFamily,r.fontSize,r.fontColor)),i+=`        <c:numFmt formatCode="General" sourceLinked="1"/>
`,i+=lt(r),r?.tickMark?.major||(i+=`        <c:majorTickMark val="out"/>
`),r?.tickMark?.minor||(i+=`        <c:minorTickMark val="none"/>
`),i+=`        <c:tickLblPos val="nextTo"/>
`,i+=`        <c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>
`,i+=ct(r),i+=`        <c:crossAx val="${Pt}"/>
`,i+=pt(r),r?.crossesAt||(i+=`        <c:crosses val="autoZero"/>
`),i+=`        <c:auto val="1"/>
`,i+=`        <c:lblAlgn val="ctr"/>
`,i+=`        <c:lblOffset val="100"/>
`,i+=`      </c:catAx>
`,i}function Vn(e){let t=e.secondaryValueAxis??e.valueAxis,n=t?.visible!==!1?"0":"1",o=`      <c:valAx>
`;return o+=`        <c:axId val="${Pt}"/>
`,o+=Nt(t?.min,t?.max),o+=`        <c:delete val="${n}"/>
`,o+=`        <c:axPos val="r"/>
`,t?.gridlines&&(o+=mr(t.gridlines)),t?.title&&(o+=mt(t.title,t.fontFamily,t.fontSize,t.fontColor)),t?.numberFormat?o+=`        <c:numFmt formatCode="${E(t.numberFormat)}" sourceLinked="0"/>
`:o+=`        <c:numFmt formatCode="General" sourceLinked="1"/>
`,o+=lt(t),t?.tickMark?.major||(o+=`        <c:majorTickMark val="out"/>
`),t?.tickMark?.minor||(o+=`        <c:minorTickMark val="none"/>
`),o+=`        <c:tickLblPos val="nextTo"/>
`,o+=`        <c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>
`,o+=ct(t),o+=`        <c:crossAx val="${pr}"/>
`,o+=pt(t),o+=`        <c:crosses val="max"/>
`,o+=`        <c:crossBetween val="between"/>
`,o+=`      </c:valAx>
`,o}function Un(e,t){let r=e.categoryAxis,o=r?.visible!==!1?"0":"1",a=t==="bar"?"l":"b",i=`      <c:catAx>
`;return i+=`        <c:axId val="${le}"/>
`,i+=Ss(e),i+=`        <c:delete val="${o}"/>
`,i+=`        <c:axPos val="${a}"/>
`,r?.title&&(i+=mt(r.title,r.fontFamily,r.fontSize,r.fontColor)),i+=`        <c:numFmt formatCode="General" sourceLinked="1"/>
`,i+=lt(r),r?.tickMark?.major||(i+=`        <c:majorTickMark val="out"/>
`),r?.tickMark?.minor||(i+=`        <c:minorTickMark val="none"/>
`),i+=`        <c:tickLblPos val="nextTo"/>
`,i+=`        <c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>
`,i+=ct(r),i+=`        <c:crossAx val="${ue}"/>
`,i+=pt(r),r?.crossesAt||(i+=`        <c:crosses val="autoZero"/>
`),i+=`        <c:auto val="1"/>
`,i+=`        <c:lblAlgn val="ctr"/>
`,i+=`        <c:lblOffset val="100"/>
`,i+=`      </c:catAx>
`,i}function On(e,t){let r=e.valueAxis,o=r?.visible!==!1?"0":"1",a=t==="bar"?"b":"l",i=`      <c:valAx>
`;return i+=`        <c:axId val="${ue}"/>
`,i+=Nt(r?.min,r?.max),i+=`        <c:delete val="${o}"/>
`,i+=`        <c:axPos val="${a}"/>
`,r?.gridlines?i+=mr(r.gridlines):i+=`        <c:majorGridlines/>
`,r?.title&&(i+=mt(r.title,r.fontFamily,r.fontSize,r.fontColor)),r?.numberFormat?i+=`        <c:numFmt formatCode="${E(r.numberFormat)}" sourceLinked="0"/>
`:i+=`        <c:numFmt formatCode="General" sourceLinked="1"/>
`,i+=lt(r),r?.tickMark?.major||(i+=`        <c:majorTickMark val="out"/>
`),r?.tickMark?.minor||(i+=`        <c:minorTickMark val="none"/>
`),i+=`        <c:tickLblPos val="nextTo"/>
`,i+=`        <c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>
`,i+=ct(r),i+=`        <c:crossAx val="${le}"/>
`,i+=pt(r),r?.crossesAt||(i+=`        <c:crosses val="autoZero"/>
`),i+=`        <c:crossBetween val="between"/>
`,i+=`      </c:valAx>
`,i}function mt(e,t,r,n){let o=he(r??10,10),a=t??"Calibri",i='<a:srgbClr val="000000"/>';n&&(i=`<a:srgbClr val="${O(n)}"/>`);let s=`        <c:title>
`;return s+=`          <c:tx>
`,s+=`            <c:rich>
`,s+=`              <a:bodyPr/>
`,s+=`              <a:lstStyle/>
`,s+=`              <a:p>
`,s+=`                <a:r>
`,s+=`                  <a:rPr lang="en-US" sz="${o}">
`,s+=`                    <a:solidFill>${i}</a:solidFill>
`,s+=`                    <a:latin typeface="${I(a)}"/>
`,s+=`                  </a:rPr>
`,s+=`                  <a:t>${E(e)}</a:t>
`,s+=`                </a:r>
`,s+=`              </a:p>
`,s+=`            </c:rich>
`,s+=`          </c:tx>
`,s+=`          <c:overlay val="0"/>
`,s+=`        </c:title>
`,s}function Gn(e){let t=`      <c:scatterChart>
`;t+=`        <c:scatterStyle val="lineMarker"/>
`,t+=`        <c:varyColors val="0"/>
`;let r=e.xySeries??[];for(let n=0;n<r.length;n++)t+=ws(r[n],n);return t+=`        <c:axId val="${ot}"/>
`,t+=`        <c:axId val="${it}"/>
`,t+=`      </c:scatterChart>
`,t}function Hn(e){let t=`      <c:bubbleChart>
`;t+=`        <c:varyColors val="0"/>
`;let r=e.xySeries??[];for(let n=0;n<r.length;n++)t+=Is(r[n],n);return t+=`        <c:bubbleScale val="100"/>
`,t+=`        <c:axId val="${ot}"/>
`,t+=`        <c:axId val="${it}"/>
`,t+=`      </c:bubbleChart>
`,t}function ws(e,t){let r=O(e.color??me[t%me.length]),n=e.dataPoints,o=t*2,a=`        <c:ser>
`;a+=`          <c:idx val="${t}"/>
`,a+=`          <c:order val="${t}"/>
`,a+=`          <c:tx>
`,a+=`            <c:strRef>
`,a+=`              <c:f>Sheet1!$${Z(o+1)}$1</c:f>
`,a+=`              <c:strCache>
`,a+=`                <c:ptCount val="1"/>
`,a+=`                <c:pt idx="0"><c:v>${E(e.name)}</c:v></c:pt>
`,a+=`              </c:strCache>
`,a+=`            </c:strRef>
`,a+=`          </c:tx>
`,a+=`          <c:spPr>
`,a+=`            <a:solidFill><a:srgbClr val="${r}"/></a:solidFill>
`,a+=`          </c:spPr>
`;let i=Z(o);a+=`          <c:xVal>
`,a+=`            <c:numRef>
`,a+=`              <c:f>Sheet1!$${i}$2:$${i}$${n.length+1}</c:f>
`,a+=`              <c:numCache>
`,a+=`                <c:formatCode>General</c:formatCode>
`,a+=`                <c:ptCount val="${n.length}"/>
`;for(let l=0;l<n.length;l++)a+=`                <c:pt idx="${l}"><c:v>${n[l].x}</c:v></c:pt>
`;a+=`              </c:numCache>
`,a+=`            </c:numRef>
`,a+=`          </c:xVal>
`;let s=Z(o+1);a+=`          <c:yVal>
`,a+=`            <c:numRef>
`,a+=`              <c:f>Sheet1!$${s}$2:$${s}$${n.length+1}</c:f>
`,a+=`              <c:numCache>
`,a+=`                <c:formatCode>General</c:formatCode>
`,a+=`                <c:ptCount val="${n.length}"/>
`;for(let l=0;l<n.length;l++)a+=`                <c:pt idx="${l}"><c:v>${n[l].y}</c:v></c:pt>
`;return a+=`              </c:numCache>
`,a+=`            </c:numRef>
`,a+=`          </c:yVal>
`,a+=`        </c:ser>
`,a}function Is(e,t){let r=O(e.color??me[t%me.length]),n=e.dataPoints,o=t*3,a=`        <c:ser>
`;a+=`          <c:idx val="${t}"/>
`,a+=`          <c:order val="${t}"/>
`,a+=`          <c:tx>
`,a+=`            <c:strRef>
`,a+=`              <c:f>Sheet1!$${Z(o+1)}$1</c:f>
`,a+=`              <c:strCache>
`,a+=`                <c:ptCount val="1"/>
`,a+=`                <c:pt idx="0"><c:v>${E(e.name)}</c:v></c:pt>
`,a+=`              </c:strCache>
`,a+=`            </c:strRef>
`,a+=`          </c:tx>
`,a+=`          <c:spPr>
`,a+=`            <a:solidFill><a:srgbClr val="${r}"/></a:solidFill>
`,a+=`          </c:spPr>
`;let i=Z(o);a+=`          <c:xVal>
`,a+=`            <c:numRef>
`,a+=`              <c:f>Sheet1!$${i}$2:$${i}$${n.length+1}</c:f>
`,a+=`              <c:numCache>
`,a+=`                <c:formatCode>General</c:formatCode>
`,a+=`                <c:ptCount val="${n.length}"/>
`;for(let p=0;p<n.length;p++)a+=`                <c:pt idx="${p}"><c:v>${n[p].x}</c:v></c:pt>
`;a+=`              </c:numCache>
`,a+=`            </c:numRef>
`,a+=`          </c:xVal>
`;let s=Z(o+1);a+=`          <c:yVal>
`,a+=`            <c:numRef>
`,a+=`              <c:f>Sheet1!$${s}$2:$${s}$${n.length+1}</c:f>
`,a+=`              <c:numCache>
`,a+=`                <c:formatCode>General</c:formatCode>
`,a+=`                <c:ptCount val="${n.length}"/>
`;for(let p=0;p<n.length;p++)a+=`                <c:pt idx="${p}"><c:v>${n[p].y}</c:v></c:pt>
`;a+=`              </c:numCache>
`,a+=`            </c:numRef>
`,a+=`          </c:yVal>
`;let l=Z(o+2);a+=`          <c:bubbleSize>
`,a+=`            <c:numRef>
`,a+=`              <c:f>Sheet1!$${l}$2:$${l}$${n.length+1}</c:f>
`,a+=`              <c:numCache>
`,a+=`                <c:formatCode>General</c:formatCode>
`,a+=`                <c:ptCount val="${n.length}"/>
`;for(let p=0;p<n.length;p++)a+=`                <c:pt idx="${p}"><c:v>${n[p].size??1}</c:v></c:pt>
`;return a+=`              </c:numCache>
`,a+=`            </c:numRef>
`,a+=`          </c:bubbleSize>
`,a+=`        </c:ser>
`,a}function We(e,t=[]){if(!e)return"";let r=`        <c:dLbls>
`;for(let n of t)r+=`          <c:dLbl><c:idx val="${n}"/><c:delete val="1"/></c:dLbl>
`;if(e.formatCode?r+=`          <c:numFmt formatCode="${I(e.formatCode)}" sourceLinked="0"/>
`:r+=`          <c:numFmt formatCode="General" sourceLinked="1"/>
`,e.fontFamily||e.fontSize||e.fontColor){let n=he(e.fontSize??10,10),o=e.fontFamily??"Calibri",a="";e.fontColor&&(a=`<a:solidFill><a:srgbClr val="${O(e.fontColor)}"/></a:solidFill>`),r+=`          <c:txPr>
`,r+=`            <a:bodyPr/>
`,r+=`            <a:lstStyle/>
`,r+=`            <a:p>
`,r+=`              <a:pPr><a:defRPr sz="${n}">${a}<a:latin typeface="${I(o)}"/></a:defRPr></a:pPr>
`,r+=`              <a:endParaRPr lang="en-US" dirty="0"/>
`,r+=`            </a:p>
`,r+=`          </c:txPr>
`}return e.position&&(r+=`          <c:dLblPos val="${e.position}"/>
`),r+=`          <c:showLegendKey val="0"/>
`,r+=`          <c:showVal val="${we(e.showVal)}"/>
`,r+=`          <c:showCatName val="${we(e.showCatName)}"/>
`,r+=`          <c:showSerName val="${we(e.showSerName)}"/>
`,r+=`          <c:showPercent val="${we(e.showPercent)}"/>
`,r+=`          <c:showBubbleSize val="0"/>
`,r+=`        </c:dLbls>
`,r}function Rs(e){let t=`<c:marker><c:symbol val="${e.symbol}"/>`;return e.size!==void 0&&(t+=`<c:size val="${e.size}"/>`),e.color&&(t+=`<c:spPr><a:solidFill><a:srgbClr val="${O(e.color)}"/></a:solidFill></c:spPr>`),t+="</c:marker>",t}var Fs={linear:"linear",exponential:"exp",logarithmic:"log",polynomial:"poly",power:"power",movingAvg:"movingAvg"};function ks(e){let t=`          <c:trendline>
`;e.color&&(t+=`            <c:spPr><a:ln><a:solidFill><a:srgbClr val="${O(e.color)}"/></a:solidFill></a:ln></c:spPr>
`);let r=Fs[e.type]??e.type;return t+=`            <c:trendlineType val="${r}"/>
`,e.type==="polynomial"&&e.order!==void 0&&(t+=`            <c:order val="${e.order}"/>
`),e.type==="movingAvg"&&e.period!==void 0&&(t+=`            <c:period val="${e.period}"/>
`),e.forward!==void 0&&(t+=`            <c:forward val="${e.forward}"/>
`),e.backward!==void 0&&(t+=`            <c:backward val="${e.backward}"/>
`),e.displayEquation&&(t+=`            <c:dispEq val="1"/>
`),e.displayRSquared&&(t+=`            <c:dispRSqr val="1"/>
`),t+=`          </c:trendline>
`,t}function As(e){let t=`          <c:errBars>
`;return t+=`            <c:errDir val="${e.direction==="x"?"x":"y"}"/>
`,t+=`            <c:errBarType val="both"/>
`,t+=`            <c:errValType val="${e.type}"/>
`,e.value!==void 0&&(t+=`            <c:val val="${e.value}"/>
`),t+=`          </c:errBars>
`,t}function $t(e,t){let r=e.series??[],n="";for(let o=0;o<r.length;o++)n+=qe(e,r[o],o,!1,t);return n}function qe(e,t,r,n,o){let a=O(t.color??me[r%me.length]),i=e.categories??[],s=i.length,l=`        <c:ser>
`;if(l+=`          <c:idx val="${r}"/>
`,l+=`          <c:order val="${r}"/>
`,l+=`          <c:tx>
`,l+=`            <c:strRef>
`,l+=`              <c:f>Sheet1!$${Z(r+1)}$1</c:f>
`,l+=`              <c:strCache>
`,l+=`                <c:ptCount val="1"/>
`,l+=`                <c:pt idx="0"><c:v>${E(t.name)}</c:v></c:pt>
`,l+=`              </c:strCache>
`,l+=`            </c:strRef>
`,l+=`          </c:tx>
`,n)for(let c=0;c<t.values.length;c++){let f=O(t.pointColors?.[c]??me[c%me.length]);l+=`          <c:dPt>
`,l+=`            <c:idx val="${c}"/>
`,e.explosion!==void 0&&(l+=`            <c:explosion val="${e.explosion}"/>
`),l+=`            <c:spPr><a:solidFill><a:srgbClr val="${f}"/></a:solidFill></c:spPr>
`,l+=`          </c:dPt>
`}else{let c=e.chartType==="line"||e.chartType==="scatter";l+=`          <c:spPr>
`,l+=`            <a:solidFill><a:srgbClr val="${a}"/></a:solidFill>
`,c&&(l+=`            <a:ln w="19050"><a:solidFill><a:srgbClr val="${a}"/></a:solidFill></a:ln>
`),l+=`          </c:spPr>
`}let p=t.marker??o?.defaultMarker;if(p&&o?.allowMarker!==!1&&(l+=`          ${Rs(p)}
`),!n&&t.pointColors)for(let c=0;c<t.pointColors.length;c++)t.pointColors[c]&&(l+=`          <c:dPt>
`,l+=`            <c:idx val="${c}"/>
`,l+=`            <c:spPr><a:solidFill><a:srgbClr val="${O(t.pointColors[c])}"/></a:solidFill></c:spPr>
`,l+=`          </c:dPt>
`);t.dataLabels&&o?.allowDataLabels!==!1&&(l+=We(t.dataLabels)),t.trendline&&(l+=ks(t.trendline)),t.errorBars&&(l+=As(t.errorBars)),l+=`          <c:cat>
`,l+=`            <c:strRef>
`,l+=`              <c:f>Sheet1!$A$2:$A$${s+1}</c:f>
`,l+=`              <c:strCache>
`,l+=`                <c:ptCount val="${s}"/>
`;for(let c=0;c<s;c++)l+=`                <c:pt idx="${c}"><c:v>${E(i[c])}</c:v></c:pt>
`;l+=`              </c:strCache>
`,l+=`            </c:strRef>
`,l+=`          </c:cat>
`;let m=Z(r+1);l+=`          <c:val>
`,l+=`            <c:numRef>
`,l+=`              <c:f>Sheet1!$${m}$2:$${m}$${s+1}</c:f>
`,l+=`              <c:numCache>
`,l+=`                <c:formatCode>General</c:formatCode>
`,l+=`                <c:ptCount val="${s}"/>
`;for(let c=0;c<t.values.length;c++)l+=`                <c:pt idx="${c}"><c:v>${t.values[c]}</c:v></c:pt>
`;return l+=`              </c:numCache>
`,l+=`            </c:numRef>
`,l+=`          </c:val>
`,o?.smooth&&(l+=`          <c:smooth val="1"/>
`),l+=`        </c:ser>
`,l}function jn(e){let t=e.barGrouping??"clustered",r=e.barDirection??"col",n=`      <c:barChart>
`;return n+=`        <c:barDir val="${r}"/>
`,n+=`        <c:grouping val="${t}"/>
`,n+=`        <c:varyColors val="0"/>
`,n+=$t(e,{allowMarker:!1}),n+=We(e.dataLabels),e.gapWidth!==void 0&&(n+=`        <c:gapWidth val="${e.gapWidth}"/>
`),e.overlap!==void 0&&(n+=`        <c:overlap val="${e.overlap}"/>
`),n+=`        <c:axId val="${le}"/>
`,n+=`        <c:axId val="${ue}"/>
`,n+=`      </c:barChart>
`,n}function Wn(e){let t=e.lineGrouping??"standard",r=`      <c:lineChart>
`;return r+=`        <c:grouping val="${t}"/>
`,r+=`        <c:varyColors val="0"/>
`,r+=$t(e,{smooth:e.smooth,defaultMarker:e.marker,allowDataLabels:!1}),r+=`        <c:marker val="${e.marker?"1":"0"}"/>
`,r+=`        <c:axId val="${le}"/>
`,r+=`        <c:axId val="${ue}"/>
`,r+=`      </c:lineChart>
`,r}function qn(e){let t=`      <c:pieChart>
`;t+=`        <c:varyColors val="1"/>
`;let r=e.series??[];return r.length>0&&(t+=qe(e,r[0],0,!0)),t+=We(e.dataLabels),e.firstSliceAng!==void 0&&(t+=`        <c:firstSliceAng val="${e.firstSliceAng}"/>
`),t+=`      </c:pieChart>
`,t}function Yn(e){let t=e.areaGrouping??"standard",r=`      <c:areaChart>
`;r+=`        <c:grouping val="${t}"/>
`,r+=`        <c:varyColors val="0"/>
`,r+=$t(e,{allowMarker:!1});let n=(e.categories?.length??0)-1;return r+=We(e.dataLabels,n>=2?[0,n]:[]),r+=`        <c:axId val="${le}"/>
`,r+=`        <c:axId val="${ue}"/>
`,r+=`      </c:areaChart>
`,r}function Kn(e){let t=`      <c:doughnutChart>
`;return t+=`        <c:varyColors val="1"/>
`,e.series&&e.series.length>0&&(t+=qe(e,e.series[0],0,!0)),t+=We(e.dataLabels),t+=`        <c:holeSize val="${e.holeSize??50}"/>
`,e.firstSliceAng!==void 0&&(t+=`        <c:firstSliceAng val="${e.firstSliceAng}"/>
`),t+=`      </c:doughnutChart>
`,t}function Jn(e){let t=e.radarStyle??"marker";t==="radar"&&(t="marker");let r=`      <c:radarChart>
`;return r+=`        <c:radarStyle val="${t}"/>
`,r+=`        <c:varyColors val="0"/>
`,r+=$t(e),r+=We(e.dataLabels),r+=`        <c:axId val="${le}"/>
`,r+=`        <c:axId val="${ue}"/>
`,r+=`      </c:radarChart>
`,r}function Zn(e){let t=`      <c:dTable>
`;if(t+=`        <c:showHorzBorder val="${we(e.showHorzBorder!==!1)}"/>
`,t+=`        <c:showVertBorder val="${we(e.showVertBorder!==!1)}"/>
`,t+=`        <c:showOutline val="${we(e.showOutline!==!1)}"/>
`,t+=`        <c:showKeys val="${we(e.showKeys)}"/>
`,e.fontFamily||e.fontSize){let r=he(e.fontSize??10,10),n=e.fontFamily??"Calibri";t+=`        <c:txPr>
`,t+=`          <a:bodyPr/>
`,t+=`          <a:lstStyle/>
`,t+=`          <a:p>
`,t+=`            <a:pPr><a:defRPr sz="${r}"><a:latin typeface="${I(n)}"/></a:defRPr></a:pPr>
`,t+=`            <a:endParaRPr lang="en-US" dirty="0"/>
`,t+=`          </a:p>
`,t+=`        </c:txPr>
`}return t+=`      </c:dTable>
`,t}function Qn(e){let t=e.series??[],r=new Map;for(let o=0;o<t.length;o++){let a=t[o].overrideType??e.chartType;r.has(a)||r.set(a,[]),r.get(a).push({series:t[o],originalIndex:o})}let n="";for(let[o,a]of r){let s=a.some(l=>l.series.targetAxis==="secondary")?Pt:ue;switch(o){case"bar":{let l=e.barDirection??"col";n+=`      <c:barChart>
`,n+=`        <c:barDir val="${l}"/>
`,n+=`        <c:grouping val="${e.barGrouping??"clustered"}"/>
`,n+=`        <c:varyColors val="0"/>
`;for(let p of a)n+=qe(e,p.series,p.originalIndex,!1,{allowMarker:!1});n+=`        <c:axId val="${le}"/>
`,n+=`        <c:axId val="${s}"/>
`,n+=`      </c:barChart>
`;break}case"line":{n+=`      <c:lineChart>
`,n+=`        <c:grouping val="${e.lineGrouping??"standard"}"/>
`,n+=`        <c:varyColors val="0"/>
`;for(let l of a)n+=qe(e,l.series,l.originalIndex,!1,{smooth:e.smooth,defaultMarker:e.marker});n+=`        <c:marker val="${e.marker?"1":"0"}"/>
`,n+=`        <c:axId val="${le}"/>
`,n+=`        <c:axId val="${s}"/>
`,n+=`      </c:lineChart>
`;break}case"area":{n+=`      <c:areaChart>
`,n+=`        <c:grouping val="${e.areaGrouping??"standard"}"/>
`,n+=`        <c:varyColors val="0"/>
`;for(let l of a)n+=qe(e,l.series,l.originalIndex,!1,{allowMarker:!1});n+=`        <c:axId val="${le}"/>
`,n+=`        <c:axId val="${s}"/>
`,n+=`      </c:areaChart>
`;break}}}return n}function ea(e,t){let r=jt(e,t);return!r||!r.shouldEmitManualLayout?`      <c:layout/>
`:["      <c:layout>","        <c:manualLayout>",'          <c:layoutTarget val="inner"/>','          <c:xMode val="edge"/>','          <c:yMode val="edge"/>','          <c:wMode val="factor"/>','          <c:hMode val="factor"/>',`          <c:x val="${r.plotArea.x}"/>`,`          <c:y val="${r.plotArea.y}"/>`,`          <c:w val="${r.plotArea.w}"/>`,`          <c:h val="${r.plotArea.h}"/>`,"        </c:manualLayout>",`      </c:layout>
`].join(`
`)}function ta(e){let t=e.title,r=he(t.fontSize??14,14),n=t.bold?' b="1"':"",o=t.fontFamily??"Calibri",a='<a:srgbClr val="000000"/>';t.fontColor&&(a=`<a:srgbClr val="${O(t.fontColor)}"/>`);let i=`    <c:title>
`;return i+=`      <c:tx>
`,i+=`        <c:rich>
`,i+=`          <a:bodyPr/>
`,i+=`          <a:lstStyle/>
`,i+=`          <a:p>
`,i+=`            <a:r>
`,i+=`              <a:rPr lang="en-US" sz="${r}"${n}>
`,i+=`                <a:solidFill>${a}</a:solidFill>
`,i+=`                <a:latin typeface="${I(o)}"/>
`,i+=`              </a:rPr>
`,i+=`              <a:t>${E(t.text)}</a:t>
`,i+=`            </a:r>
`,i+=`          </a:p>
`,i+=`        </c:rich>
`,i+=`      </c:tx>
`,i+=`      <c:overlay val="0"/>
`,i+=`    </c:title>
`,i}function dr(e){if(!e)return"<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>";let t="<c:spPr>";if(e.fill?t+=`<a:solidFill><a:srgbClr val="${O(e.fill)}"/></a:solidFill>`:t+="<a:noFill/>",e.borderColor||e.borderWidth){let r=e.borderWidth?vt(e.borderWidth*ie):ie,n=O(e.borderColor??"#000000");t+=`<a:ln w="${r}"><a:solidFill><a:srgbClr val="${n}"/></a:solidFill></a:ln>`}else t+="<a:ln><a:noFill/></a:ln>";return t+="</c:spPr>",t}function ra(e,t){let r=Fr(e,t);if(r==="none")return"";let n=jt(e,t),o={bottom:"b",top:"t",left:"l",right:"r"},a=`    <c:legend>
`;a+=`      <c:legendPos val="${o[r]??"b"}"/>
`,a+=Ls(n,t),e.chartType==="waterfall"?a+=`      <c:legendEntry><c:idx val="0"/><c:delete val="1"/></c:legendEntry>
`:e.chartType==="funnel"&&(a+=`      <c:legendEntry><c:idx val="0"/><c:delete val="1"/></c:legendEntry>
`,a+=`      <c:legendEntry><c:idx val="2"/><c:delete val="1"/></c:legendEntry>
`),a+=`      <c:overlay val="0"/>
`;let i=e.legend?.fill,s=e.legend?.border;if(i||s){if(a+=`      <c:spPr>
`,i){let l=O(i);a+=`        <a:solidFill><a:srgbClr val="${l}"/></a:solidFill>
`}if(s){let l=O(s.color??"#000000"),p=s.width?vt(s.width*ie):ie;a+=`        <a:ln w="${p}"><a:solidFill><a:srgbClr val="${l}"/></a:solidFill></a:ln>
`}a+=`      </c:spPr>
`}if(e.legend?.fontFamily||e.legend?.fontSize||e.legend?.fontColor){let l=he(e.legend.fontSize??10,10),p=e.legend.fontFamily??"Calibri",m="";e.legend.fontColor&&(m=`<a:solidFill><a:srgbClr val="${O(e.legend.fontColor)}"/></a:solidFill>`),a+=`      <c:txPr>
`,a+=`        <a:bodyPr/>
`,a+=`        <a:lstStyle/>
`,a+=`        <a:p>
`,a+=`          <a:pPr><a:defRPr sz="${l}">${m}<a:latin typeface="${I(p)}"/></a:defRPr></a:pPr>
`,a+=`          <a:endParaRPr lang="en-US" dirty="0"/>
`,a+=`        </a:p>
`,a+=`      </c:txPr>
`}return a+=`    </c:legend>
`,a}function Ls(e,t){let r=e?.legendBox;if(!t||!e?.shouldEmitManualLayout||!r)return"";let n=Math.min(1,Math.max(0,r.left/t.width)),o=Math.min(1,Math.max(0,r.top/t.height)),a=Te(n),i=Te(o),s=Te(Math.min(r.width/t.width,1-n)),l=Te(Math.min(r.height/t.height,1-o));return["      <c:layout>","        <c:manualLayout>",'          <c:xMode val="edge"/>','          <c:yMode val="edge"/>','          <c:wMode val="factor"/>','          <c:hMode val="factor"/>',`          <c:x val="${a}"/>`,`          <c:y val="${i}"/>`,`          <c:w val="${s}"/>`,`          <c:h val="${l}"/>`,"        </c:manualLayout>",`      </c:layout>
`].join(`
`)}function _t(e){let t=e.filter(n=>(n.kind??"text")==="text"),r=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;r+=`<c:userShapes xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:cdr="http://schemas.openxmlformats.org/drawingml/2006/chartDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
`;for(let n=0;n<t.length;n++){let o=t[n],a=Te(o.x/100),i=Te(o.y/100),s=Te((o.x+(o.width??20))/100),l=Te((o.y+(o.height??10))/100),p=o.shapeType??"rect",m=he(o.fontSize??10,10),c=o.fontFamily??"Calibri",f=o.bold?' b="1"':"",d=o.italic?' i="1"':"";if(r+=`  <cdr:relSizeAnchor>
`,r+=`    <cdr:from><cdr:x>${a}</cdr:x><cdr:y>${i}</cdr:y></cdr:from>
`,r+=`    <cdr:to><cdr:x>${s}</cdr:x><cdr:y>${l}</cdr:y></cdr:to>
`,r+=`    <cdr:sp>
`,r+=`      <cdr:nvSpPr>
`,r+=`        <cdr:cNvPr id="${n+2}" name="Annotation ${n+1}"/>
`,r+=`        <cdr:cNvSpPr/>
`,r+=`      </cdr:nvSpPr>
`,r+=`      <cdr:spPr>
`,r+=`        <a:prstGeom prst="${p}"><a:avLst/></a:prstGeom>
`,o.fill){let g=O(o.fill);r+=`        <a:solidFill><a:srgbClr val="${g}"/></a:solidFill>
`}else r+=`        <a:noFill/>
`;if(o.borderColor||o.borderWidth){let g=O(o.borderColor??"#000000"),F=o.borderWidth?vt(o.borderWidth*ie):ie;r+=`        <a:ln w="${F}"><a:solidFill><a:srgbClr val="${g}"/></a:solidFill></a:ln>
`}r+=`      </cdr:spPr>
`,r+=`      <cdr:txBody>
`,r+=`        <a:bodyPr vertOverflow="clip" wrap="square"/>
`,r+=`        <a:lstStyle/>
`,r+=`        <a:p>
`,r+=`          <a:r>
`;let $="";o.fontColor&&($=`<a:solidFill><a:srgbClr val="${O(o.fontColor)}"/></a:solidFill>`),r+=`            <a:rPr lang="en-US" sz="${m}"${f}${d}>${$}<a:latin typeface="${I(c)}"/></a:rPr>
`,r+=`            <a:t>${E(o.text)}</a:t>
`,r+=`          </a:r>
`,r+=`        </a:p>
`,r+=`      </cdr:txBody>
`,r+=`    </cdr:sp>
`,r+=`  </cdr:relSizeAnchor>
`}return r+="</c:userShapes>",r}function na(e){let t=St(e);if(!t)return"";let r=t.categories,n=t.values,o=new Set(t.totalIndices??[]),a=O(t.increaseColor??"#4472C4"),i=O(t.decreaseColor??"#ED7D31"),s=O(t.totalColor??"#A9D18E"),l=[],p=[],m=[],c=0;for(let d=0;d<n.length;d++)if(o.has(d))l.push(0),p.push(n[d]),m.push(0),c=n[d];else{let $=n[d];$>=0?(l.push(c),p.push($),m.push(0)):(l.push(c+$),p.push(0),m.push(-$)),c+=$}let f=`      <c:barChart>
`;f+=`        <c:barDir val="col"/>
`,f+=`        <c:grouping val="stacked"/>
`,f+=`        <c:varyColors val="0"/>
`,f+=`        <c:ser>
`,f+=`          <c:idx val="0"/>
`,f+=`          <c:order val="0"/>
`,f+=`          <c:tx><c:strRef><c:f>Sheet1!$B$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>Base</c:v></c:pt></c:strCache></c:strRef></c:tx>
`,f+=`          <c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>
`,f+=`          <c:cat><c:strRef><c:f>Sheet1!$A$2:$A$${r.length+1}</c:f><c:strCache><c:ptCount val="${r.length}"/>`;for(let d=0;d<r.length;d++)f+=`<c:pt idx="${d}"><c:v>${E(r[d])}</c:v></c:pt>`;f+=`</c:strCache></c:strRef></c:cat>
`,f+=`          <c:val><c:numRef><c:f>Sheet1!$B$2:$B$${r.length+1}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${r.length}"/>`;for(let d=0;d<r.length;d++)f+=`<c:pt idx="${d}"><c:v>${l[d]}</c:v></c:pt>`;f+=`</c:numCache></c:numRef></c:val>
`,f+=`        </c:ser>
`,f+=`        <c:ser>
`,f+=`          <c:idx val="1"/>
`,f+=`          <c:order val="1"/>
`,f+=`          <c:tx><c:strRef><c:f>Sheet1!$C$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>Increase</c:v></c:pt></c:strCache></c:strRef></c:tx>
`,f+=`          <c:spPr><a:solidFill><a:srgbClr val="${a}"/></a:solidFill></c:spPr>
`;for(let d=0;d<r.length;d++)o.has(d)&&(f+=`          <c:dPt><c:idx val="${d}"/><c:spPr><a:solidFill><a:srgbClr val="${s}"/></a:solidFill></c:spPr></c:dPt>
`);f+=`          <c:cat><c:strRef><c:f>Sheet1!$A$2:$A$${r.length+1}</c:f><c:strCache><c:ptCount val="${r.length}"/>`;for(let d=0;d<r.length;d++)f+=`<c:pt idx="${d}"><c:v>${E(r[d])}</c:v></c:pt>`;f+=`</c:strCache></c:strRef></c:cat>
`,f+=`          <c:val><c:numRef><c:f>Sheet1!$C$2:$C$${r.length+1}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${r.length}"/>`;for(let d=0;d<r.length;d++){let $=o.has(d)?n[d]:p[d];f+=`<c:pt idx="${d}"><c:v>${$}</c:v></c:pt>`}f+=`</c:numCache></c:numRef></c:val>
`,f+=`        </c:ser>
`,f+=`        <c:ser>
`,f+=`          <c:idx val="2"/>
`,f+=`          <c:order val="2"/>
`,f+=`          <c:tx><c:strRef><c:f>Sheet1!$D$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>Decrease</c:v></c:pt></c:strCache></c:strRef></c:tx>
`,f+=`          <c:spPr><a:solidFill><a:srgbClr val="${i}"/></a:solidFill></c:spPr>
`,f+=`          <c:cat><c:strRef><c:f>Sheet1!$A$2:$A$${r.length+1}</c:f><c:strCache><c:ptCount val="${r.length}"/>`;for(let d=0;d<r.length;d++)f+=`<c:pt idx="${d}"><c:v>${E(r[d])}</c:v></c:pt>`;f+=`</c:strCache></c:strRef></c:cat>
`,f+=`          <c:val><c:numRef><c:f>Sheet1!$D$2:$D$${r.length+1}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${r.length}"/>`;for(let d=0;d<r.length;d++)f+=`<c:pt idx="${d}"><c:v>${m[d]}</c:v></c:pt>`;return f+=`</c:numCache></c:numRef></c:val>
`,f+=`        </c:ser>
`,f+=`        <c:axId val="${le}"/>
`,f+=`        <c:axId val="${ue}"/>
`,f+=`      </c:barChart>
`,f}function aa(e){let t=e.stockData;if(!t)return"";let r=t.categories,n=t.hiLowLines!==!1,o=t.upDownBars!==!1,a=`      <c:stockChart>
`,i=[{name:"Open",values:t.open,col:"B"},{name:"High",values:t.high,col:"C"},{name:"Low",values:t.low,col:"D"},{name:"Close",values:t.close,col:"E"}];for(let s=0;s<i.length;s++){let l=i[s];a+=`        <c:ser>
`,a+=`          <c:idx val="${s}"/>
`,a+=`          <c:order val="${s}"/>
`,a+=`          <c:tx><c:strRef><c:f>Sheet1!$${l.col}$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${E(l.name)}</c:v></c:pt></c:strCache></c:strRef></c:tx>
`,a+=`          <c:cat><c:strRef><c:f>Sheet1!$A$2:$A$${r.length+1}</c:f><c:strCache><c:ptCount val="${r.length}"/>`;for(let p=0;p<r.length;p++)a+=`<c:pt idx="${p}"><c:v>${E(r[p])}</c:v></c:pt>`;a+=`</c:strCache></c:strRef></c:cat>
`,a+=`          <c:val><c:numRef><c:f>Sheet1!$${l.col}$2:$${l.col}$${r.length+1}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${r.length}"/>`;for(let p=0;p<l.values.length;p++)a+=`<c:pt idx="${p}"><c:v>${l.values[p]}</c:v></c:pt>`;a+=`</c:numCache></c:numRef></c:val>
`,a+=`        </c:ser>
`}if(n&&(a+=`        <c:hiLowLines/>
`),o){let s=O(t.upColor??"#FFFFFF"),l=O(t.downColor??"#000000");a+=`        <c:upDownBars>
`,a+=`          <c:gapWidth val="150"/>
`,a+=`          <c:upBars><c:spPr><a:solidFill><a:srgbClr val="${s}"/></a:solidFill></c:spPr></c:upBars>
`,a+=`          <c:downBars><c:spPr><a:solidFill><a:srgbClr val="${l}"/></a:solidFill></c:spPr></c:downBars>
`,a+=`        </c:upDownBars>
`}return a+=`        <c:axId val="${le}"/>
`,a+=`        <c:axId val="${ue}"/>
`,a+=`      </c:stockChart>
`,a}function sa(e){let t=e.funnelData;if(!t)return"";let r=t.categories,n=t.values,o=Math.max(...n),a=[],i=[];for(let l=0;l<n.length;l++){let p=(o-n[l])/2;a.push(p),i.push(p)}let s=`      <c:barChart>
`;s+=`        <c:barDir val="bar"/>
`,s+=`        <c:grouping val="stacked"/>
`,s+=`        <c:varyColors val="0"/>
`,s+=`        <c:ser>
`,s+=`          <c:idx val="0"/>
`,s+=`          <c:order val="0"/>
`,s+=`          <c:tx><c:strRef><c:f>Sheet1!$B$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>LeftSpacer</c:v></c:pt></c:strCache></c:strRef></c:tx>
`,s+=`          <c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>
`,s+=`          <c:cat><c:strRef><c:f>Sheet1!$A$2:$A$${r.length+1}</c:f><c:strCache><c:ptCount val="${r.length}"/>`;for(let l=0;l<r.length;l++)s+=`<c:pt idx="${l}"><c:v>${E(r[l])}</c:v></c:pt>`;s+=`</c:strCache></c:strRef></c:cat>
`,s+=`          <c:val><c:numRef><c:f>Sheet1!$B$2:$B$${r.length+1}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${r.length}"/>`;for(let l=0;l<r.length;l++)s+=`<c:pt idx="${l}"><c:v>${a[l]}</c:v></c:pt>`;s+=`</c:numCache></c:numRef></c:val>
`,s+=`        </c:ser>
`,s+=`        <c:ser>
`,s+=`          <c:idx val="1"/>
`,s+=`          <c:order val="1"/>
`,s+=`          <c:tx><c:strRef><c:f>Sheet1!$C$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>Value</c:v></c:pt></c:strCache></c:strRef></c:tx>
`,s+=`          <c:spPr><a:solidFill><a:srgbClr val="${me[0]}"/></a:solidFill></c:spPr>
`;for(let l=0;l<r.length;l++){let p=O(t.colors?.[l]??me[l%me.length]);s+=`          <c:dPt><c:idx val="${l}"/><c:spPr><a:solidFill><a:srgbClr val="${p}"/></a:solidFill></c:spPr></c:dPt>
`}s+=`          <c:cat><c:strRef><c:f>Sheet1!$A$2:$A$${r.length+1}</c:f><c:strCache><c:ptCount val="${r.length}"/>`;for(let l=0;l<r.length;l++)s+=`<c:pt idx="${l}"><c:v>${E(r[l])}</c:v></c:pt>`;s+=`</c:strCache></c:strRef></c:cat>
`,s+=`          <c:val><c:numRef><c:f>Sheet1!$C$2:$C$${r.length+1}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${r.length}"/>`;for(let l=0;l<r.length;l++)s+=`<c:pt idx="${l}"><c:v>${n[l]}</c:v></c:pt>`;s+=`</c:numCache></c:numRef></c:val>
`,s+=`        </c:ser>
`,s+=`        <c:ser>
`,s+=`          <c:idx val="2"/>
`,s+=`          <c:order val="2"/>
`,s+=`          <c:tx><c:strRef><c:f>Sheet1!$D$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>RightSpacer</c:v></c:pt></c:strCache></c:strRef></c:tx>
`,s+=`          <c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>
`,s+=`          <c:cat><c:strRef><c:f>Sheet1!$A$2:$A$${r.length+1}</c:f><c:strCache><c:ptCount val="${r.length}"/>`;for(let l=0;l<r.length;l++)s+=`<c:pt idx="${l}"><c:v>${E(r[l])}</c:v></c:pt>`;s+=`</c:strCache></c:strRef></c:cat>
`,s+=`          <c:val><c:numRef><c:f>Sheet1!$D$2:$D$${r.length+1}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${r.length}"/>`;for(let l=0;l<r.length;l++)s+=`<c:pt idx="${l}"><c:v>${i[l]}</c:v></c:pt>`;return s+=`</c:numCache></c:numRef></c:val>
`,s+=`        </c:ser>
`,s+=`        <c:gapWidth val="50"/>
`,s+=`        <c:overlap val="100"/>
`,s+=`        <c:axId val="${le}"/>
`,s+=`        <c:axId val="${ue}"/>
`,s+=`      </c:barChart>
`,s}function fr(e,t,r){let n=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;n+=`<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
`,n+=`  <c:date1904 val="0"/>
`,n+=`  <c:lang val="en-US"/>
`,n+=`  <c:roundedCorners val="0"/>
`,n+=`  <c:chart>
`,e.title?.text?n+=ta(e):n+=`    <c:autoTitleDeleted val="1"/>
`,n+=`    <c:plotArea>
`,n+=ea(e,r);let o=e.series?.some(a=>a.overrideType!==void 0)??!1;if(o)n+=Qn(e);else switch(e.chartType){case"bar":n+=jn(e);break;case"line":n+=Wn(e);break;case"pie":n+=qn(e);break;case"area":n+=Yn(e);break;case"doughnut":n+=Kn(e);break;case"scatter":n+=Gn(e);break;case"bubble":n+=Hn(e);break;case"radar":n+=Jn(e);break;case"waterfall":n+=na(e);break;case"stock":n+=aa(e);break;case"funnel":n+=sa(e);break}if(e.chartType==="scatter"||e.chartType==="bubble")n+=_n(e),n+=zn(e);else if(e.chartType!=="pie"&&e.chartType!=="doughnut"){let a=e.chartType==="funnel"?"bar":e.chartType==="waterfall"||e.chartType==="stock"?"col":e.barDirection;n+=Un(e,a),n+=On(e,a),o&&e.series?.some(s=>s.targetAxis==="secondary")&&(n+=Xn(e,a),n+=Vn(e))}return e.dataTable&&(n+=Zn(e.dataTable)),n+=`      ${dr(e.plotArea)}
`,n+=`    </c:plotArea>
`,n+=ra(e,r),n+=`    <c:plotVisOnly val="1"/>
`,e.dispBlanksAs&&(n+=`    <c:dispBlanksAs val="${e.dispBlanksAs}"/>
`),n+=`  </c:chart>
`,e.chartArea&&(n+=`  ${dr(e.chartArea)}
`),n+=`  <c:externalData r:id="${t}">
`,n+=`    <c:autoUpdate val="0"/>
`,n+=`  </c:externalData>
`,n+=`  <c:printSettings>
`,n+=`    <c:headerFooter/>
`,n+=`    <c:pageMargins b="0.75" l="0.7" r="0.7" t="0.75" header="0.3" footer="0.3"/>
`,n+=`    <c:pageSetup/>
`,n+=`  </c:printSettings>
`,e.annotations&&e.annotations.length>0&&(n+=`  <c:userShapes r:id="rId2"/>
`),n+="</c:chartSpace>",n}var zt={package:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/package",chartUserShapes:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/chartUserShapes"};function hr(e){return re([{id:"rId1",type:zt.package,target:e}])}function ur(e){return re([{id:"rId1",type:zt.package,target:e}])}function gr(e,t){let r=[{id:"rId1",type:zt.package,target:e},{id:"rId2",type:zt.chartUserShapes,target:t}];return re(r)}var Ie=Cr(Rr(),1);function Me(e){for(let t of Object.values(e.files))t.date=ae}async function xr(e){switch(Wt(e.chartType)){case"xy":return Ms(e);case"waterfall":return Bs(e);case"stock":return Ns(e);case"funnel":return _s(e);case"hierarchy":return zs(e);case"histogram":return Xs(e);case"boxWhisker":return Vs(e);case"standard":break}let t=new Ie.default,r=[],n=new Map,o=l=>{let p=n.get(l);return p===void 0&&(p=r.length,r.push(l),n.set(l,p)),p},a=e.series??[],i=e.categories??[];for(let l of a)o(l.name);for(let l of i)o(l);let s={date:ae};return t.file("[Content_Types].xml",Ee(),s),t.file("_rels/.rels",Be(),s),t.file("xl/workbook.xml",De(),s),t.file("xl/_rels/workbook.xml.rels",Ne(),s),t.file("xl/styles.xml",_e(),s),t.file("xl/sharedStrings.xml",ze(r),s),t.file("xl/worksheets/sheet1.xml",Ts(e,o),s),Me(t),await t.generateAsync({type:"nodebuffer",compression:"DEFLATE",compressionOptions:{level:6}})}function Ee(){return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`}function Be(){return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`}function De(){return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`}function Ne(){return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`}function _e(){return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>`}function ze(e){let t=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;t+=`<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${e.length}" uniqueCount="${e.length}">
`;for(let r of e)t+=`  <si><t>${E(r)}</t></si>
`;return t+="</sst>",t}function Ts(e,t){let r=e.series??[],n=e.categories??[],o=Z(r.length),a=n.length+1,i=`A1:${o}${a}`,s=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;s+=`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
`,s+=`  <dimension ref="${i}"/>
`,s+=`  <sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>
`,s+=`  <sheetFormatPr defaultRowHeight="15"/>
`,s+=`  <sheetData>
`,s+=`    <row r="1">
`;for(let l=0;l<r.length;l++){let p=Z(l+1);s+=`      <c r="${p}1" t="s"><v>${t(r[l].name)}</v></c>
`}s+=`    </row>
`;for(let l=0;l<n.length;l++){let p=l+2;s+=`    <row r="${p}">
`,s+=`      <c r="A${p}" t="s"><v>${t(n[l])}</v></c>
`;for(let m=0;m<r.length;m++){let c=Z(m+1);s+=`      <c r="${c}${p}"><v>${r[m].values[l]}</v></c>
`}s+=`    </row>
`}return s+=`  </sheetData>
`,s+="</worksheet>",s}async function Ms(e){let t=new Ie.default,r=e.xySeries??[],n=e.chartType==="bubble",o=[],a=new Map,i=l=>{let p=a.get(l);return p===void 0&&(p=o.length,o.push(l),a.set(l,p)),p};for(let l of r)i(l.name);let s={date:ae};return t.file("[Content_Types].xml",Ee(),s),t.file("_rels/.rels",Be(),s),t.file("xl/workbook.xml",De(),s),t.file("xl/_rels/workbook.xml.rels",Ne(),s),t.file("xl/styles.xml",_e(),s),t.file("xl/sharedStrings.xml",ze(o),s),t.file("xl/worksheets/sheet1.xml",Es(r,n,i),s),Me(t),await t.generateAsync({type:"nodebuffer",compression:"DEFLATE",compressionOptions:{level:6}})}function Es(e,t,r){let n=t?3:2,o=e.length*n,a=Math.max(...e.map(p=>p.dataPoints.length),0),s=`A1:${Z(o-1)}${a+1}`,l=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;l+=`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
`,l+=`  <dimension ref="${s}"/>
`,l+=`  <sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>
`,l+=`  <sheetFormatPr defaultRowHeight="15"/>
`,l+=`  <sheetData>
`,l+=`    <row r="1">
`;for(let p=0;p<e.length;p++){let m=p*n,c=Z(m+1);l+=`      <c r="${c}1" t="s"><v>${r(e[p].name)}</v></c>
`}l+=`    </row>
`;for(let p=0;p<a;p++){let m=p+2;l+=`    <row r="${m}">
`;for(let c=0;c<e.length;c++){let f=e[c].dataPoints,d=c*n;if(p<f.length){let $=Z(d),g=Z(d+1);if(l+=`      <c r="${$}${m}"><v>${f[p].x}</v></c>
`,l+=`      <c r="${g}${m}"><v>${f[p].y}</v></c>
`,t){let F=Z(d+2);l+=`      <c r="${F}${m}"><v>${f[p].size??1}</v></c>
`}}}l+=`    </row>
`}return l+=`  </sheetData>
`,l+="</worksheet>",l}async function Bs(e){let t=new Ie.default,r=St(e);if(!r)throw new Q("waterfall chart requires normalized categories and values",{code:"VALIDATION_FAILED",phase:"chart"});let n=r.categories,o=r.values,a=new Set(r.totalIndices??[]),i=[],s=[],l=[],p=0;for(let $=0;$<o.length;$++)if(a.has($))i.push(0),s.push(o[$]),l.push(0),p=o[$];else{let g=o[$];g>=0?(i.push(p),s.push(g),l.push(0)):(i.push(p+g),s.push(0),l.push(-g)),p+=g}let m=[],c=new Map,f=$=>{let g=c.get($);return g===void 0&&(g=m.length,m.push($),c.set($,g)),g};f("Base"),f("Increase"),f("Decrease");for(let $ of n)f($);let d={date:ae};return t.file("[Content_Types].xml",Ee(),d),t.file("_rels/.rels",Be(),d),t.file("xl/workbook.xml",De(),d),t.file("xl/_rels/workbook.xml.rels",Ne(),d),t.file("xl/styles.xml",_e(),d),t.file("xl/sharedStrings.xml",ze(m),d),t.file("xl/worksheets/sheet1.xml",Ds(n,i,s,l,f),d),Me(t),await t.generateAsync({type:"nodebuffer",compression:"DEFLATE",compressionOptions:{level:6}})}function Ds(e,t,r,n,o){let a=`A1:D${e.length+1}`,i=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;i+=`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
`,i+=`  <dimension ref="${a}"/>
`,i+=`  <sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>
`,i+=`  <sheetFormatPr defaultRowHeight="15"/>
`,i+=`  <sheetData>
`,i+=`    <row r="1">
`,i+=`      <c r="B1" t="s"><v>${o("Base")}</v></c>
`,i+=`      <c r="C1" t="s"><v>${o("Increase")}</v></c>
`,i+=`      <c r="D1" t="s"><v>${o("Decrease")}</v></c>
`,i+=`    </row>
`;for(let s=0;s<e.length;s++){let l=s+2;i+=`    <row r="${l}">
`,i+=`      <c r="A${l}" t="s"><v>${o(e[s])}</v></c>
`,i+=`      <c r="B${l}"><v>${t[s]}</v></c>
`,i+=`      <c r="C${l}"><v>${r[s]}</v></c>
`,i+=`      <c r="D${l}"><v>${n[s]}</v></c>
`,i+=`    </row>
`}return i+=`  </sheetData>
`,i+="</worksheet>",i}async function Ns(e){let t=new Ie.default,r=e.stockData,n=r.categories,o=[],a=new Map,i=m=>{let c=a.get(m);return c===void 0&&(c=o.length,o.push(m),a.set(m,c)),c};i("Open"),i("High"),i("Low"),i("Close");for(let m of n)i(m);let s={date:ae};t.file("[Content_Types].xml",Ee(),s),t.file("_rels/.rels",Be(),s),t.file("xl/workbook.xml",De(),s),t.file("xl/_rels/workbook.xml.rels",Ne(),s),t.file("xl/styles.xml",_e(),s),t.file("xl/sharedStrings.xml",ze(o),s);let l=`A1:E${n.length+1}`,p=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;p+=`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
`,p+=`  <dimension ref="${l}"/>
`,p+=`  <sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>
`,p+=`  <sheetFormatPr defaultRowHeight="15"/>
`,p+=`  <sheetData>
`,p+=`    <row r="1">
`,p+=`      <c r="B1" t="s"><v>${i("Open")}</v></c>
`,p+=`      <c r="C1" t="s"><v>${i("High")}</v></c>
`,p+=`      <c r="D1" t="s"><v>${i("Low")}</v></c>
`,p+=`      <c r="E1" t="s"><v>${i("Close")}</v></c>
`,p+=`    </row>
`;for(let m=0;m<n.length;m++){let c=m+2;p+=`    <row r="${c}">
`,p+=`      <c r="A${c}" t="s"><v>${i(n[m])}</v></c>
`,p+=`      <c r="B${c}"><v>${r.open[m]}</v></c>
`,p+=`      <c r="C${c}"><v>${r.high[m]}</v></c>
`,p+=`      <c r="D${c}"><v>${r.low[m]}</v></c>
`,p+=`      <c r="E${c}"><v>${r.close[m]}</v></c>
`,p+=`    </row>
`}return p+=`  </sheetData>
`,p+=`
`,p+="</worksheet>",t.file("xl/worksheets/sheet1.xml",p,s),Me(t),await t.generateAsync({type:"nodebuffer",compression:"DEFLATE",compressionOptions:{level:6}})}async function _s(e){let t=new Ie.default,r=e.funnelData,n=r.categories,o=r.values,a=Math.max(...o),i=[],s=new Map,l=f=>{let d=s.get(f);return d===void 0&&(d=i.length,i.push(f),s.set(f,d)),d};l("LeftSpacer"),l("Value"),l("RightSpacer");for(let f of n)l(f);let p={date:ae};t.file("[Content_Types].xml",Ee(),p),t.file("_rels/.rels",Be(),p),t.file("xl/workbook.xml",De(),p),t.file("xl/_rels/workbook.xml.rels",Ne(),p),t.file("xl/styles.xml",_e(),p),t.file("xl/sharedStrings.xml",ze(i),p);let m=`A1:D${n.length+1}`,c=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;c+=`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
`,c+=`  <dimension ref="${m}"/>
`,c+=`  <sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>
`,c+=`  <sheetFormatPr defaultRowHeight="15"/>
`,c+=`  <sheetData>
`,c+=`    <row r="1">
`,c+=`      <c r="B1" t="s"><v>${l("LeftSpacer")}</v></c>
`,c+=`      <c r="C1" t="s"><v>${l("Value")}</v></c>
`,c+=`      <c r="D1" t="s"><v>${l("RightSpacer")}</v></c>
`,c+=`    </row>
`;for(let f=0;f<n.length;f++){let d=f+2,$=(a-o[f])/2;c+=`    <row r="${d}">
`,c+=`      <c r="A${d}" t="s"><v>${l(n[f])}</v></c>
`,c+=`      <c r="B${d}"><v>${$}</v></c>
`,c+=`      <c r="C${d}"><v>${o[f]}</v></c>
`,c+=`      <c r="D${d}"><v>${$}</v></c>
`,c+=`    </row>
`}return c+=`  </sheetData>
`,c+=`
`,c+="</worksheet>",t.file("xl/worksheets/sheet1.xml",c,p),Me(t),await t.generateAsync({type:"nodebuffer",compression:"DEFLATE",compressionOptions:{level:6}})}function oa(e,t=[]){let r=[];for(let n of e)n.children&&n.children.length>0?r.push(...oa(n.children,[n.name,...t])):r.push({path:[n.name,...t],value:n.value??0});return r}async function zs(e){let t=new Ie.default,r=e.treemapData??e.sunburstData;if(!r)return yr();let n=oa(r.categories),o=Math.max(...n.map(d=>d.path.length),1),a=[],i=new Map,s=d=>{let $=i.get(d);return $===void 0&&($=a.length,a.push(d),i.set(d,$)),$},l=[];for(let d=o-1;d>=0;d--)l.push(d===0?"Category":`Level${d}`);l.push("Value");for(let d of l)s(d);for(let d of n)for(let $ of d.path)s($);let p={date:ae};t.file("[Content_Types].xml",Ee(),p),t.file("_rels/.rels",Be(),p),t.file("xl/workbook.xml",De(),p),t.file("xl/_rels/workbook.xml.rels",Ne(),p),t.file("xl/styles.xml",_e(),p),t.file("xl/sharedStrings.xml",ze(a),p);let c=`A1:${Z(l.length-1)}${n.length+1}`,f=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;f+=`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
`,f+=`  <dimension ref="${c}"/>
`,f+=`  <sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>
`,f+=`  <sheetFormatPr defaultRowHeight="15"/>
`,f+=`  <sheetData>
`,f+=`    <row r="1">
`;for(let d=0;d<l.length;d++)f+=`      <c r="${Z(d)}1" t="s"><v>${s(l[d])}</v></c>
`;f+=`    </row>
`;for(let d=0;d<n.length;d++){let $=d+2,g=n[d];f+=`    <row r="${$}">
`;for(let F=o-1;F>=0;F--){let P=o-1-F,u=F<g.path.length?g.path[F]:"";u&&(f+=`      <c r="${Z(P)}${$}" t="s"><v>${s(u)}</v></c>
`)}f+=`      <c r="${Z(o)}${$}"><v>${g.value}</v></c>
`,f+=`    </row>
`}return f+=`  </sheetData>
`,f+=`
`,f+="</worksheet>",t.file("xl/worksheets/sheet1.xml",f,p),Me(t),await t.generateAsync({type:"nodebuffer",compression:"DEFLATE",compressionOptions:{level:6}})}async function Xs(e){let t=new Ie.default,r=e.histogramData;if(!r)return yr();let n=[],o=new Map,a=m=>{let c=o.get(m);return c===void 0&&(c=n.length,n.push(m),o.set(m,c)),c},i=r.seriesName??"Values";a(i);let s={date:ae};t.file("[Content_Types].xml",Ee(),s),t.file("_rels/.rels",Be(),s),t.file("xl/workbook.xml",De(),s),t.file("xl/_rels/workbook.xml.rels",Ne(),s),t.file("xl/styles.xml",_e(),s),t.file("xl/sharedStrings.xml",ze(n),s);let l=`A1:A${r.values.length+1}`,p=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;p+=`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
`,p+=`  <dimension ref="${l}"/>
`,p+=`  <sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>
`,p+=`  <sheetFormatPr defaultRowHeight="15"/>
`,p+=`  <sheetData>
`,p+=`    <row r="1">
`,p+=`      <c r="A1" t="s"><v>${a(i)}</v></c>
`,p+=`    </row>
`;for(let m=0;m<r.values.length;m++){let c=m+2;p+=`    <row r="${c}">
`,p+=`      <c r="A${c}"><v>${r.values[m]}</v></c>
`,p+=`    </row>
`}return p+=`  </sheetData>
`,p+=`
`,p+="</worksheet>",t.file("xl/worksheets/sheet1.xml",p,s),Me(t),await t.generateAsync({type:"nodebuffer",compression:"DEFLATE",compressionOptions:{level:6}})}async function Vs(e){let t=new Ie.default,r=e.boxWhiskerData;if(!r)return yr();let n=[],o=new Map,a=c=>{let f=o.get(c);return f===void 0&&(f=n.length,n.push(c),o.set(c,f)),f};for(let c of r.categories)a(c);for(let c of r.series)a(c.name);let i={date:ae};t.file("[Content_Types].xml",Ee(),i),t.file("_rels/.rels",Be(),i),t.file("xl/workbook.xml",De(),i),t.file("xl/_rels/workbook.xml.rels",Ne(),i),t.file("xl/styles.xml",_e(),i),t.file("xl/sharedStrings.xml",ze(n),i);let s=Math.max(...r.series.map(c=>c.values.length),0),p=`A1:${Z(r.series.length)}${s+1}`,m=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;m+=`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
`,m+=`  <dimension ref="${p}"/>
`,m+=`  <sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>
`,m+=`  <sheetFormatPr defaultRowHeight="15"/>
`,m+=`  <sheetData>
`,m+=`    <row r="1">
`;for(let c=0;c<r.series.length;c++)m+=`      <c r="${Z(c+1)}1" t="s"><v>${a(r.series[c].name)}</v></c>
`;m+=`    </row>
`;for(let c=0;c<s;c++){let f=c+2;if(m+=`    <row r="${f}">
`,r.categories.length>0){let d=c%r.categories.length;m+=`      <c r="A${f}" t="s"><v>${a(r.categories[d])}</v></c>
`}for(let d=0;d<r.series.length;d++)c<r.series[d].values.length&&(m+=`      <c r="${Z(d+1)}${f}"><v>${r.series[d].values[c]}</v></c>
`);m+=`    </row>
`}return m+=`  </sheetData>
`,m+=`
`,m+="</worksheet>",t.file("xl/worksheets/sheet1.xml",m,i),Me(t),await t.generateAsync({type:"nodebuffer",compression:"DEFLATE",compressionOptions:{level:6}})}async function yr(){let e=new Ie.default,t={date:ae};return e.file("[Content_Types].xml",Ee(),t),e.file("_rels/.rels",Be(),t),e.file("xl/workbook.xml",De(),t),e.file("xl/_rels/workbook.xml.rels",Ne(),t),e.file("xl/styles.xml",_e(),t),e.file("xl/sharedStrings.xml",ze([]),t),e.file("xl/worksheets/sheet1.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1"/><sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><sheetData/></worksheet>`,t),Me(e),await e.generateAsync({type:"nodebuffer",compression:"DEFLATE",compressionOptions:{level:6}})}function vr(e,t=[]){let r=[];for(let n of e)n.children&&n.children.length>0?r.push(...vr(n.children,[n.name,...t])):r.push({path:[n.name,...t],value:n.value??0,color:n.color});return r}function Pr(e,t){switch(e.chartType){case"treemap":return Us(e.treemapData,t,e);case"sunburst":return Os(e.sunburstData,t,e);case"histogram":return Gs(e.histogramData,t,e);case"boxWhisker":return Hs(e.boxWhiskerData,t,e);default:return""}}function Xt(){return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cx:chartSpace xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
`}function Vt(e){return`    <cx:externalData r:id="${e}"/>
`}function ia(e,t){let r=`      <cx:strDim type="cat">
`;for(let n=0;n<t;n++){r+=`        <cx:lvl ptCount="${e.length}">
`;for(let o=0;o<e.length;o++){let a=n<e[o].path.length?e[o].path[n]:"";r+=`          <cx:pt idx="${o}">${E(a)}</cx:pt>
`}r+=`        </cx:lvl>
`}return r+=`      </cx:strDim>
`,r}function $r(e){let t=`      <cx:numDim type="val">
`;t+=`        <cx:lvl ptCount="${e.length}">
`;for(let r=0;r<e.length;r++)t+=`          <cx:pt idx="${r}">${e[r]}</cx:pt>
`;return t+=`        </cx:lvl>
`,t+=`      </cx:numDim>
`,t}function Ut(e){if(!e)return"";let t=e.position??"ctr",r=e.showVal?"1":"0",n=e.showCatName?"1":"0",o=e.showSerName?"1":"0",a=`          <cx:dataLabels pos="${t}">
`;return a+=`            <cx:visibility seriesName="${o}" categoryName="${n}" value="${r}"/>
`,a+=`          </cx:dataLabels>
`,a}function la(e){let t="";for(let r=0;r<e.length;r++)if(e[r].color){let n=O(e[r].color);t+=`          <cx:dataPt idx="${r}">
`,t+=`            <cx:spPr>
`,t+=`              <a:solidFill><a:srgbClr val="${n}"/></a:solidFill>
`,t+=`            </cx:spPr>
`,t+=`          </cx:dataPt>
`}return t}function Ot(e){let t=e.legend;return t?.position==="none"?"":`    <cx:legend pos="${{bottom:"b",top:"t",left:"l",right:"r"}[t?.position??"bottom"]??"b"}" align="ctr" overlay="0"/>
`}function Gt(e){if(!e.title?.text)return"";let t=e.title,r=he(t.fontSize??14,14),n=t.bold?' b="1"':"",o=t.fontFamily??"Calibri",a='<a:srgbClr val="000000"/>';t.fontColor&&(a=`<a:srgbClr val="${O(t.fontColor)}"/>`);let i=`    <cx:title>
`;return i+=`      <cx:tx>
`,i+=`        <cx:rich>
`,i+=`          <a:bodyPr/>
`,i+=`          <a:lstStyle/>
`,i+=`          <a:p>
`,i+=`            <a:r>
`,i+=`              <a:rPr lang="en-US" sz="${r}"${n}>
`,i+=`                <a:solidFill>${a}</a:solidFill>
`,i+=`                <a:latin typeface="${I(o)}"/>
`,i+=`              </a:rPr>
`,i+=`              <a:t>${E(t.text)}</a:t>
`,i+=`            </a:r>
`,i+=`          </a:p>
`,i+=`        </cx:rich>
`,i+=`      </cx:tx>
`,i+=`    </cx:title>
`,i}function Us(e,t,r){let n=vr(e.categories),o=Math.max(...n.map(i=>i.path.length),1),a=Xt();return a+=`  <cx:chartData>
`,a+=Vt(t),a+=`    <cx:data id="0">
`,a+=ia(n,o),a+=$r(n.map(i=>i.value)),a+=`    </cx:data>
`,a+=`  </cx:chartData>
`,a+=`  <cx:chart>
`,a+=Gt(r),a+=`    <cx:plotArea>
`,a+=`      <cx:plotAreaRegion>
`,a+=`        <cx:series layoutId="treemap">
`,a+=la(n),a+=Ut(e.dataLabels),a+=`          <cx:dataId val="0"/>
`,a+=`        </cx:series>
`,a+=`      </cx:plotAreaRegion>
`,a+=`    </cx:plotArea>
`,a+=Ot(r),a+=`  </cx:chart>
`,a+="</cx:chartSpace>",a}function Os(e,t,r){let n=vr(e.categories),o=Math.max(...n.map(i=>i.path.length),1),a=Xt();return a+=`  <cx:chartData>
`,a+=Vt(t),a+=`    <cx:data id="0">
`,a+=ia(n,o),a+=$r(n.map(i=>i.value)),a+=`    </cx:data>
`,a+=`  </cx:chartData>
`,a+=`  <cx:chart>
`,a+=Gt(r),a+=`    <cx:plotArea>
`,a+=`      <cx:plotAreaRegion>
`,a+=`        <cx:series layoutId="sunburst">
`,a+=la(n),a+=Ut(e.dataLabels),a+=`          <cx:dataId val="0"/>
`,a+=`        </cx:series>
`,a+=`      </cx:plotAreaRegion>
`,a+=`    </cx:plotArea>
`,a+=Ot(r),a+=`  </cx:chart>
`,a+="</cx:chartSpace>",a}function Gs(e,t,r){let n=e.values,o=Xt();if(o+=`  <cx:chartData>
`,o+=Vt(t),o+=`    <cx:data id="0">
`,o+=$r(n),o+=`    </cx:data>
`,o+=`  </cx:chartData>
`,o+=`  <cx:chart>
`,o+=Gt(r),o+=`    <cx:plotArea>
`,o+=`      <cx:plotAreaRegion>
`,o+=`        <cx:series layoutId="clusteredColumn">
`,e.color){let a=O(e.color);o+=`          <cx:spPr>
`,o+=`            <a:solidFill><a:srgbClr val="${a}"/></a:solidFill>
`,o+=`          </cx:spPr>
`}return o+=Ut(e.dataLabels),o+=`          <cx:dataId val="0"/>
`,o+=`        </cx:series>
`,o+=`      </cx:plotAreaRegion>
`,o+=`    </cx:plotArea>
`,o+=Ot(r),o+=`  </cx:chart>
`,o+="</cx:chartSpace>",o}function Hs(e,t,r){let n=Xt();n+=`  <cx:chartData>
`,n+=Vt(t);for(let o=0;o<e.series.length;o++){let a=e.series[o];if(n+=`    <cx:data id="${o}">
`,e.categories.length>0){n+=`      <cx:strDim type="cat">
`,n+=`        <cx:lvl ptCount="${a.values.length}">
`;for(let i=0;i<a.values.length;i++){let s=i%e.categories.length;n+=`          <cx:pt idx="${i}">${E(e.categories[s])}</cx:pt>
`}n+=`        </cx:lvl>
`,n+=`      </cx:strDim>
`}n+=`      <cx:numDim type="val">
`,n+=`        <cx:lvl ptCount="${a.values.length}">
`;for(let i=0;i<a.values.length;i++)n+=`          <cx:pt idx="${i}">${a.values[i]}</cx:pt>
`;n+=`        </cx:lvl>
`,n+=`      </cx:numDim>
`,n+=`    </cx:data>
`}n+=`  </cx:chartData>
`,n+=`  <cx:chart>
`,n+=Gt(r),n+=`    <cx:plotArea>
`,n+=`      <cx:plotAreaRegion>
`;for(let o=0;o<e.series.length;o++){let a=e.series[o];if(n+=`        <cx:series layoutId="boxWhisker">
`,n+=`          <cx:tx>
`,n+=`            <cx:txData><cx:v>${E(a.name)}</cx:v></cx:txData>
`,n+=`          </cx:tx>
`,a.color){let i=O(a.color);n+=`          <cx:spPr>
`,n+=`            <a:solidFill><a:srgbClr val="${i}"/></a:solidFill>
`,n+=`          </cx:spPr>
`}n+=Ut(e.dataLabels),n+=`          <cx:dataId val="${o}"/>
`,n+=`        </cx:series>
`}return n+=`      </cx:plotAreaRegion>
`,n+=`    </cx:plotArea>
`,n+=Ot(r),n+=`  </cx:chart>
`,n+="</cx:chartSpace>",n}var js=new Set(["bar","line","pie","doughnut","scatter","area"]);function Ic(e){return e.charts.reduce((t,r)=>{let n=t;return r.rId&&(n+=1),r.fallbackRId&&(n+=1),n},0)}function Ws(e){return je(e,t=>t.type==="Chart",{skipHidden:!0})}async function Rc(e,t,r,n={current:1},o,a,i){let s=Ws(e);if(s.length===0)return{charts:[]};let l=Fe(),p=r,m=s.map(f=>{let d=f.chartData;if(l){if(!js.has(d.chartType))throw new Q(`Chart type "${d.chartType}" requires Runstamp Pro. Free tier supports: bar, line, pie, doughnut, scatter, area. See https://runstamp.com/pricing`,{code:"FEATURE_REQUIRES_UPGRADE",phase:"chart"});if(d.series?.some(T=>T.overrideType!==void 0))throw new Q("Combo charts (mixed chart types) are not available in the size-constrained @runstamp/pptx lite bundle; install @runstamp/pptx for the full engine.",{code:"FEATURE_REQUIRES_UPGRADE",phase:"chart"})}let $=Je(d.chartType),F=f._compatibility?.mode==="visual_fallback",P=F?0:$?n.current++:t.current++,u=F?void 0:`rId${p++}`,X,D,A=F||a;if(A&&!o)throw new Q("Chart fallback rasterization was required, but no media allocation context was available for the fallback image.",{code:"PPTX_CHART_FALLBACK_MISSING",phase:"chart"});return A&&o&&(X=`rId${p++}`,D=o.current++),{chartNode:f,chartData:d,isChartEx:$,chartIndex:P,rId:u,fallbackRId:X,mediaIdx:D,imageOnly:F,requiresFallbackImage:A}});return{charts:await Promise.all(m.map(async f=>{let{chartNode:d,chartData:$,isChartEx:g,chartIndex:F,rId:P,imageOnly:u}=f,X,D,A,T;if(f.requiresFallbackImage&&f.fallbackRId!=null&&f.mediaIdx!=null){let{width:b,height:M}=d.layout;if(D=await Jt($,{width:b,height:M},i),!D)throw new Q("Chart fallback rasterization was required, but no fallback image artifact was produced.",{code:"PPTX_CHART_FALLBACK_MISSING",phase:"chart"});D&&(X=f.fallbackRId,A=`ppt/media/image${f.mediaIdx}.png`,T=`../media/image${f.mediaIdx}.png`)}let G,k,x,v;if(!u){G=await xr($);let b=($.annotations??[]).reduce((w,z)=>w+((z.kind??"text")==="text"?1:0),0),M=!g&&b>0,q=`../embeddings/${g?`chartEx${F}`:`chart${F}`}.xlsx`;g?(k=Pr($,"rId1"),x=hr(q)):(k=fr($,"rId1",{width:d.layout.width,height:d.layout.height}),M?(v=_t($.annotations),x=gr(q,`../drawings/drawing${F}.xml`)):x=ur(q))}return{chartIndex:F,rId:P,chartXml:k,chartRelsXml:x,excelBuffer:G,isChartEx:g,chartDrawingXml:v,fallbackPng:D,fallbackRId:X,fallbackMediaPath:A,fallbackRelativePath:T,renderMode:u?"image-only":X?"alternate":"native"}}))}}export{Ks as a,Zt as b,qs as c,ga as d,xa as e,ya as f,Qr as g,lo as h,go as i,xo as j,on as k,pn as l,mn as m,dn as n,fn as o,hn as p,xn as q,In as r,sl as s,Ic as t,Ws as u,Rc as v};
