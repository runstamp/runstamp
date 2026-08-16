import { createRequire as __runstampCreateRequire } from "node:module";
const require = __runstampCreateRequire(import.meta.url);
import{a as _,b as E,f as L,g as V,i as k,j as D,k as N,l as W}from"./chunk-3HORQEKB.js";import{q as H,z as j}from"./chunk-ZUACMPVE.js";import{e as I}from"./chunk-F6KKPX27.js";var O=!1;function K(t,n){let e=H(t);if(!e)return n*1.2;let i=n/e.unitsPerEm;return(e.ascent-e.descent+e.lineGap)*i}function Q(t,n,e){if(typeof t=="string"){let o=`rId${e.current++}`;return n.push({rId:o,url:t,external:!0}),{hlinkXml:`<a:hlinkClick r:id="${o}"/>`}}let i=t,a=i.tooltip?` tooltip="${S(i.tooltip)}"`:"";if(i.action)return{hlinkXml:`<a:hlinkClick r:id="" action="ppaction://hlinkshowjump?jump=${{firstSlide:"firstslide",lastSlide:"lastslide",nextSlide:"nextslide",previousSlide:"previousslide",endShow:"endshow"}[i.action]??i.action}"${a}/>`};if(i.slide!==void 0){let o=`rId${e.current++}`;return n.push({rId:o,url:`slide${i.slide}.xml`,external:!1}),{hlinkXml:`<a:hlinkClick r:id="${o}" action="ppaction://hlinksldjump"${a}/>`}}if(i.mailto){let o=`rId${e.current++}`;return n.push({rId:o,url:`mailto:${i.mailto}`,external:!0}),{hlinkXml:`<a:hlinkClick r:id="${o}"${a}/>`}}if(i.url){let o=`rId${e.current++}`;return n.push({rId:o,url:i.url,external:!0}),{hlinkXml:`<a:hlinkClick r:id="${o}"${a}/>`}}return{hlinkXml:""}}var G=_,S=E;function ct(t,n,e){let i={...e,...n},a=[];for(let[o,f]of Object.entries(i))f===!0&&a.push(`${o}="1"`);return a.length===0?`<${t}/>`:`<${t} ${a.join(" ")}/>`}function ut(){return'<a:extLst><a:ext uri="{C183D7F6-B498-43B3-948B-1728B52AA6E4}"><adec:decorative xmlns:adec="http://schemas.microsoft.com/office/drawing/2017/decorative" val="1"/></a:ext></a:extLst>'}function ft(t,n){return!!(n&&t.x===0&&t.y===0&&t.width===0&&t.height===0)}function U(t){return typeof t=="string"?[{text:t}]:t}function Y(t){let n=[],e=[];for(let i of t){let a=i.text.split(`
`);for(let o=0;o<a.length;o++)o>0&&(n.push({runs:e.length>0?e:[{text:""}]}),e=[]),a[o].length>0&&e.push({...i,text:a[o]})}return n.push({runs:e.length>0?e:[{text:""}]}),n}function pt(t){let n=t.paragraphs;if(n&&n.length>0)return n;let e=t.content??"",i=U(e);return Y(i)}function dt(t,n){if(n&&n.length>0)return n;let e=U(t??"");return Y(e)}var gt={top:"t",middle:"ctr",bottom:"b"};function Z(t){if(t.type==="none")return`        <a:buNone/>
`;let n="";if(t.type==="autoNum"){let e=t.startAt!==void 0?` startAt="${t.startAt}"`:"";n+=`        <a:buAutoNum type="${t.scheme}"${e}/>
`}else t.color&&(n+=`        <a:buClr>${k(t.color)}</a:buClr>
`),t.size!==void 0&&(n+=`        <a:buSzPct val="${Math.round(t.size*1e3)}"/>
`),t.fontFamily&&(n+=`        <a:buFont typeface="${S(t.fontFamily)}"/>
`),n+=`        <a:buChar char="${G(t.char)}"/>
`;return n}function tt(t,n){let e=t.align??n?.textAlign,i=t.lineHeight??n?.lineHeight,a=t.lineHeight!==void 0,o=t.rtl??n?.rtl,f=t.tabStops,r=t.hangingIndent,$=t.spaceBeforePercent,g=t.spaceAfterPercent,p=e?` algn="${{left:"l",center:"ctr",right:"r",justify:"just"}[e]||"l"}"`:"",b=t.level!==void 0?` lvl="${t.level}"`:"",x=t.indent??t.marginLeft,A=x!==void 0?` marL="${L(x)}"`:"",y=r!==void 0?` indent="${V(-Math.abs(r))}"`:"",s=`      <a:pPr${p}${b}${A}${y}${o?' rtl="1"':""}>
`,M=t.lineSpacingMode;if(i)M==="percentage"?s+=`        <a:lnSpc><a:spcPct val="${Math.round(i*1e3)}"/></a:lnSpc>
`:i<4?s+=`        <a:lnSpc><a:spcPct val="${Math.round(i*1e5)}"/></a:lnSpc>
`:a?(O||(O=!0,I().warn(`[lineHeight] Value ${i} treated as legacy points (deprecated). Pass a multiplier like 1.4 instead.`)),s+=`        <a:lnSpc><a:spcPts val="${Math.round(i*100)}"/></a:lnSpc>
`):s+=`        <a:lnSpc><a:spcPts val="${Math.round(i*75)}"/></a:lnSpc>
`;else{let u=n?.fontSize??16,h=n?.fontFamily??"Liberation Sans";if(t.runs&&t.runs.length>0)for(let d of t.runs){let P=d.style?.fontSize??n?.fontSize??16;P>u&&(u=P,h=d.style?.fontFamily??n?.fontFamily??"Liberation Sans")}let m=K(h,u),v=Math.round(m*75);s+=`        <a:lnSpc><a:spcPts val="${v}"/></a:lnSpc>
`}if($!==void 0?s+=`        <a:spcBef><a:spcPct val="${Math.round($*1e3)}"/></a:spcBef>
`:t.spaceBefore!==void 0&&(s+=`        <a:spcBef><a:spcPts val="${Math.round(t.spaceBefore*100)}"/></a:spcBef>
`),g!==void 0?s+=`        <a:spcAft><a:spcPct val="${Math.round(g*1e3)}"/></a:spcAft>
`:t.spaceAfter!==void 0&&(s+=`        <a:spcAft><a:spcPts val="${Math.round(t.spaceAfter*100)}"/></a:spcAft>
`),t.bullet&&(s+=Z(t.bullet)),f&&f.length>0){s+="        <a:tabLst>";for(let u of f){let h=L(u.position),m=u.align?` algn="${u.align}"`:"";s+=`<a:tab pos="${h}"${m}/>`}s+=`</a:tabLst>
`}return s+=`      </a:pPr>
`,s}function nt(t){return/^(ar|arc|dv|fa|ha|he|khw|ks|ku|ps|sd|ug|ur|yi)(?:-|$)/i.test(t??"")}function et(t,n){let{textStyle:e,fontColor:i,fontFamily:a,hyperlinkRels:o,hyperlinkRIdCounter:f}=n,r=t.style,$=Math.round((r?.fontSize??e?.fontSize??16)*75),g=r?.color??i,F=r?.resolvedFont?.family??e?.resolvedFont?.family??r?.fontFamily??a,p=(r?.fontWeight??e?.fontWeight)==="bold",b=(r?.fontStyle??e?.fontStyle)==="italic",x=p?' b="1"':"",A=b?' i="1"':"",y=r?.textDecorationLine??e?.textDecorationLine,T=r?.textDecorationStyle??e?.textDecorationStyle,s="";(y==="underline"||y==="underline-strikethrough")&&(s=` u="${{solid:"sng",double:"dbl",dotted:"dot",dashed:"dash"}[T||"solid"]||"sng"}"`);let M="";(y==="strikethrough"||y==="underline-strikethrough")&&(M=` strike="${{solid:"sngStrike",double:"dblStrike"}[T||"solid"]||"sngStrike"}"`);let u="";r?.baseline==="superscript"?u=' baseline="30000"':r?.baseline==="subscript"&&(u=' baseline="-25000"');let h="";r?.letterSpacing!==void 0&&(h=` spc="${Math.round(r.letterSpacing*75)}"`);let m="";r?.textTransform==="uppercase"?m=' cap="all"':r?.textTransform==="capitalize"&&(m=' cap="small"');let v="";r?.kerning!==void 0&&(v=` kern="${Math.round(r.kerning*100)}"`);let d=r?.shadow,P=r?.outline,w=r?.highlight,R="";if(t.hyperlink){let{hlinkXml:c}=Q(t.hyperlink,o,f);c&&(R=`
          ${c}`)}let z=r?.lang??e?.lang??"en-US",B=r?.altLang,q=B?` altLang="${S(B)}"`:"",l=`        <a:rPr lang="${S(z)}"${q} sz="${$}"${x}${A}${s}${M}${u}${h}${m}${v} dirty="0">
`;if(P){let c=L(P.width);l+=`          <a:ln w="${c}"><a:solidFill>${k(P.color)}</a:solidFill></a:ln>
`}let C=r?.gradientFill;if(C){l+="          <a:gradFill><a:gsLst>";for(let c of C.stops){let X=Math.min(1e5,Math.max(0,Math.round(c.position*1e3)));l+=`<a:gs pos="${X}">${k(c.color)}</a:gs>`}if(l+="</a:gsLst>",C.type==="linear"){let c=N(C.angle??180);l+=`<a:lin ang="${c}" scaled="1"/>`}else l+='<a:path path="circle"><a:fillToRect l="50000" t="50000" r="50000" b="50000"/></a:path>';l+=`</a:gradFill>
`}else l+=`          <a:solidFill>${k(g)}</a:solidFill>
`;if(d){let{dist:c,dir:X}=W(d.offsetX,d.offsetY),J=L(d.blurRadius);l+=`          <a:effectLst><a:outerShdw blurRad="${J}" dist="${c}" dir="${X}" algn="ctr" rotWithShape="0">${D(d.color,d.opacity)}</a:outerShdw></a:effectLst>
`}return w&&(l+=`          <a:highlight>${k(w)}</a:highlight>
`),l+=`          <a:latin typeface="${S(F)}"/>`,l+=`
          <a:ea typeface=""/>`,l+=`
          <a:cs typeface=""/>`,nt(z)&&(l+=`
          <a:rtl/>`),R&&(l+=R),l+=`
        </a:rPr>
`,{xml:l}}function ht(t,n,e,i){let a=Math.round((n?.fontSize||16)*75),o=n?.color||"#000000",f=n?.resolvedFont?.family??n?.fontFamily??"Liberation Sans",r="";for(let $ of t){let g=j($,n);r+=`    <a:p>
`,r+=tt(g,n);for(let p of g.runs){if(p.text.length===0)continue;let b=et(p,{textStyle:n,fontSize:a,fontColor:o,fontFamily:f,hyperlinkRels:e,hyperlinkRIdCounter:i}),x=p.style?.textTransform,A=G(x==="lowercase"?p.text.toLowerCase():p.text);r+=`      <a:r>
`,r+=b.xml,r+=`        <a:t>${A}</a:t>
`,r+=`      </a:r>
`}let F=n?.lang??"en-US";r+=`      <a:endParaRPr lang="${S(F)}" dirty="0"/>
`,r+=`    </a:p>
`}return r}export{Q as a,ct as b,ut as c,ft as d,pt as e,dt as f,gt as g,ht as h};
