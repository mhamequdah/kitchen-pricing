import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Ruler, Layers, Wrench, Lightbulb, Plus, ArrowUpWideNarrow,
  Save, ClipboardList, Factory, CheckCircle2,
  AlertCircle, Sparkles, User, Gem, Printer, Loader2,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const TABS = [
  { id: 'pricing', label: 'التسعير', icon: Ruler },
  { id: 'followup', label: 'المتابعة', icon: ClipboardList },
  { id: 'operations', label: 'التشغيل', icon: Factory },
];

const PRICE_PER_METER = 2250; // سعر المتر الثابت (مخفي عن نموذج الإدخال)
const GAS_STRUT_PRICE = 150;  // سعر الجك الواحد (مخفي عن نموذج الإدخال)
const LIGHTING_PRICE_PER_METER = 50; // سعر متر الإنارة (مخفي عن نموذج الإدخال)

const HANDLE_COLOR_OPTIONS = ['أسود', 'سلفر'];
const HANDLE_CODE_OPTIONS = ['A', 'B', 'C'];

const MARBLE_TYPE_OPTIONS = ['ستارون', 'كوارتز', 'سمارت ستون'];

const num = (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const money = (n) => (isFinite(n) ? n : 0).toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
const todayISO = () => new Date().toISOString().slice(0, 10);

// مسار الشعار داخل مجلد public/assets — يحترم إعداد base في vite.config.js
const LOGO_SRC = `${import.meta.env.BASE_URL}assets/logo.png`;

function Section({ icon: Icon, title, subtitle, step, children }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E4D9C8] shadow-sm p-5 mb-4">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-lg bg-[#FAF1E4] flex items-center justify-center shrink-0 relative">
          <Icon className="w-[18px] h-[18px] text-[#A87C2A]" />
          {step && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#4A3427] text-[#F3E7D6] text-[9px] font-bold flex items-center justify-center">
              {step}
            </span>
          )}
        </div>
        <div>
          <h3 className="font-display font-bold text-[15px] text-[#2E1F17] leading-tight">{title}</h3>
          {subtitle && <p className="text-[11px] text-[#8A7A68] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  suffix,
  placeholder,
  type = 'number',
  inputMode,
  min,
  max,
  step,
  onBlur,
}) {
  const handleChange = (e) => {
    const newValue = e.target.value;

    // منع السالب للحقول الرقمية
    if (type === 'number' && newValue !== '' && Number(newValue) < 0) {
      return;
    }

    onChange(newValue);
  };

  return (
    <label className="block">
      <span className="block text-xs font-medium text-[#6B5B4B] mb-1.5">
        {label}
      </span>

      <div className="relative">
        <input
          type={type}
          inputMode={inputMode || (type === 'number' ? 'decimal' : undefined)}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          placeholder={placeholder || (type === 'number' ? '0' : '')}
          className="w-full rounded-lg border border-[#E4D9C8] bg-[#FDFBF8] px-3 py-2.5 text-sm text-[#2E1F17] focus:outline-none focus:ring-2 focus:ring-[#A87C2A]/30 focus:border-[#A87C2A] transition-colors"
        />

        {suffix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#8A7A68] pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}
function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-[#6B5B4B] mb-1.5">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[#E4D9C8] bg-[#FDFBF8] px-3 py-2.5 text-sm text-[#2E1F17] focus:outline-none focus:ring-2 focus:ring-[#A87C2A]/30 focus:border-[#A87C2A] transition-colors"
      >
        {options.map((o) => {
          const val = typeof o === 'string' ? o : o.value;
          const lbl = typeof o === 'string' ? o : o.label;
          return <option key={val} value={val}>{lbl}</option>;
        })}
      </select>
    </label>
  );
}

function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-all ${
        active
          ? 'bg-[#4A3427] border-[#4A3427] text-[#F3E7D6] shadow-sm'
          : 'bg-[#FDFBF8] border-[#E4D9C8] text-[#6B5B4B] hover:border-[#C89B6C]'
      }`}
    >
      {children}
    </button>
  );
}

function SummaryLine({ label, sub, value, strong, displayText }) {
  return (
    <div className="flex items-start justify-between py-2">
      <div>
        <p className={`text-[13px] ${strong ? 'font-bold text-[#2E1F17]' : 'text-[#5A4C3E]'}`}>{label}</p>
        {sub && <p className="text-[10.5px] text-[#A69682]">{sub}</p>}
      </div>
      {displayText ? (
        <p className="text-[13px] font-bold text-[#5A7A4E]">{displayText}</p>
      ) : (
        <p className={`text-[13px] tabular-nums ${strong ? 'font-bold text-[#A87C2A] text-base' : 'text-[#2E1F17]'}`}>
          {money(value)} <span className="text-[10.5px] font-normal text-[#A69682]">ريال</span>
        </p>
      )}
    </div>
  );
}

/* =========================================================================
   قالب الطباعة (PDF) — يُرسَم خارج الشاشة (خارج حدود العرض) ثم يُحوَّل لصورة
   بواسطة html2canvas، ثم يُدرَج داخل ملف PDF بحجم A4 عبر jsPDF.
   هذه هي الطريقة الأكثر موثوقية لإخراج نص عربي RTL متصل الحروف بشكل صحيح
   دون خادم، لأن المتصفح نفسه هو من يقوم بتهيئة (shaping) الحروف العربية.
   ========================================================================= */
const PdfQuoteTemplate = React.forwardRef(function PdfQuoteTemplate({ quote }, ref) {
  if (!quote) return null;

  // =========================
  // حسابات الطباعة فقط
  // =========================

  const marbleTotal = num(quote.marbleTotal);

  const lowerMeters = num(quote.lowerMeters);
  const upperMeters = num(quote.upperMeters);
  const tallMeters = num(quote.tallMeters);
  const marbleMeters = num(quote.marbleMeters);

  // مجموع أمتار الأعمال الخشبية
  // السفلية × 0.67 + العلوية × 0.33 + الطولية × 1.5
  const woodworkMeters =
    (lowerMeters * 0.67) +
    (upperMeters * 0.33) +
    (tallMeters * 1.5);

  // سعر الأعمال الخشبية
  // سعر المطبخ الكامل - سعر الرخام
  const woodworkPrice = num(quote.total) - marbleTotal;

  // مجموع الأمتار الكلي
  const totalMeters = woodworkMeters + marbleMeters;

  const hasMarble = !!quote.marbleType && marbleMeters > 0;

  return (
    <div
      ref={ref}
      dir="rtl"
      style={{
        position: 'fixed',
        top: 0,
        left: '-10000px',
        width: '210mm',
        minHeight: '297mm',
        backgroundColor: '#FFFFFF',
        color: '#2B1F17',
        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
        padding: '14mm',
        boxSizing: 'border-box',
      }}
    >
      {/* الشعار */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6mm' }}>
        <img
          src={LOGO_SRC}
          alt="المنى للمطابخ"
          style={{ height: '20mm', objectFit: 'contain' }}
        />
      </div>

      {/* بيانات العميل */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          flexDirection: 'row',
          gap: '10mm',
          fontSize: '11pt',
          color: '#4A3427',
          marginBottom: '4mm',
        }}
      >
        <span><strong>العميل:</strong> {quote.customerName || '—'}</span>
        <span><strong>الهاتف:</strong> {quote.phone || '—'}</span>
        <span><strong>التاريخ:</strong> {quote.date || '—'}</span>
      </div>

      {/* خط فاصل */}
      <div style={{ borderTop: '1.5px solid #C89B6C', marginBottom: '8mm' }} />

      {/* العنوان */}
      <h1
        style={{
          textAlign: 'center',
          fontSize: '20pt',
          fontWeight: 800,
          color: '#2E1F17',
          margin: '0 0 8mm 0',
        }}
      >
        عرض السعر
      </h1>

      {/* مربع التفاصيل */}
      <div
        style={{
          border: '1.5px solid #E4D9C8',
          borderRadius: '4mm',
          padding: '6mm 8mm',
          backgroundColor: '#FAF6F0',
        }}
      >

        {/* رأس الجدول */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 45mm 45mm',
            alignItems: 'center',
            paddingBottom: '3mm',
            borderBottom: '2px solid #C89B6C',
            fontSize: '11pt',
            fontWeight: 800,
            color: '#4A3427',
          }}
        >
          <span>التفاصيل</span>
          <span style={{ textAlign: 'center' }}>عدد الأمتار</span>
          <span style={{ textAlign: 'center' }}>السعر</span>
        </div>

        {/* الأعمال الخشبية */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 45mm 45mm',
            alignItems: 'center',
            padding: '4mm 0',
            borderBottom: '1px dashed #E4D9C8',
            fontSize: '12.5pt',
          }}
        >
          <span style={{ color: '#5A4C3E' }}>
            الأعمال الخشبية
          </span>

          <span
            style={{
              textAlign: 'center',
              fontWeight: 700,
              color: '#2E1F17',
            }}
          >
            {money(woodworkMeters)} م
          </span>

          <span
            style={{
              textAlign: 'center',
              fontWeight: 700,
              color: '#2E1F17',
            }}
          >
            {money(woodworkPrice)} ريال
          </span>
        </div>

        {/* الرخام */}
        {hasMarble && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 45mm 45mm',
              alignItems: 'center',
              padding: '4mm 0',
              borderBottom: '1px dashed #E4D9C8',
              fontSize: '12.5pt',
            }}
          >
            <span style={{ color: '#5A4C3E' }}>
              الرخام
            </span>

            <span
              style={{
                textAlign: 'center',
                fontWeight: 700,
                color: '#2E1F17',
              }}
            >
              {money(marbleMeters)} م
            </span>

            <span
              style={{
                textAlign: 'center',
                fontWeight: 700,
                color: '#2E1F17',
              }}
            >
              {money(marbleTotal)} ريال
            </span>
          </div>
        )}

        {/* المجموع الكلي */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 45mm 45mm',
            alignItems: 'center',
            paddingTop: '5mm',
            marginTop: '2mm',
            borderTop: '2px dashed #C89B6C',
            fontSize: '14pt',
          }}
        >
          <span
            style={{
              fontWeight: 800,
              color: '#2E1F17',
            }}
          >
            المجموع الكلي
          </span>

          <span />

          <span
            style={{
              textAlign: 'center',
              fontWeight: 800,
              color: '#A87C2A',
            }}
          >
            {money(quote.total)} ريال
          </span>
        </div>

      </div>
    </div>
  );
});
export default function KitchenPricingSystem() {
  const [tab, setTab] = useState('pricing');

  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    date: todayISO(),
    lowerMeters: '',
    upperMeters: '',
    tallMeters: '',
    heightOption: 'standard', // standard | r1 | r2
    heightMeters: '',
    gasStrutCount: '',
    lightingMeters: '',
    kitchenAdditions: '',
    marbleType: '',
    marbleCode: '',
    marblePrice: '',
    marbleMeters: '',
    handleSystem: 'normal',
    handleColor: HANDLE_COLOR_OPTIONS[0],
    handleCode: HANDLE_CODE_OPTIONS[0],
  });
  const update = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  // العروض المحفوظة تُخزَّن مؤقتًا داخل React state فقط (بدون Database وبدون window.storage)
  // البيانات تُفقد عند إعادة تحميل الصفحة أو إغلاقها — كما هو مطلوب لتطبيق Client-side بالكامل
  const [quotes, setQuotes] = useState([]);
  const [saveMsg, setSaveMsg] = useState(null);
  const [saveErr, setSaveErr] = useState(null);

  // ------- حالة الطباعة (PDF) -------
  const [printQuote, setPrintQuote] = useState(null); // العرض الجاري تجهيزه للطباعة حاليًا
  const [printingId, setPrintingId] = useState(null);  // لتعطيل الزر الخاص بهذا العرض أثناء العمل
  const [printErrId, setPrintErrId] = useState(null);
  const printRef = useRef(null);
  const printWindowRef = useRef(null);

  const calc = useMemo(() => {
    const lowerMeters = num(form.lowerMeters);
    const upperMeters = num(form.upperMeters);
    const tallMeters = num(form.tallMeters);
    const heightMeters = num(form.heightMeters);
    const gasStrutCount = num(form.gasStrutCount);
    const lightingMeters = num(form.lightingMeters);
    const kitchenAdditions = num(form.kitchenAdditions);
    const marblePrice = num(form.marblePrice);
    const marbleMeters = num(form.marbleMeters);

    const lowerCost = lowerMeters * 0.67 * PRICE_PER_METER;
    const upperCost = upperMeters * 0.33 * PRICE_PER_METER;
    const tallCost = tallMeters * 1.5 * PRICE_PER_METER;

    let heightCost = 0;
    let heightLabel = '';
    if (form.heightOption === 'r1') {
      heightCost = heightMeters * 1.5 * 0.33 * PRICE_PER_METER;
      heightLabel = 'زيادة ارتفاع (73–100 سم)';
    } else if (form.heightOption === 'r2') {
      heightCost = heightMeters * 2 * 0.33 * PRICE_PER_METER;
      heightLabel = 'زيادة ارتفاع (101–140 سم)';
    }

    const gasStrutCost = gasStrutCount * GAS_STRUT_PRICE;
    const lightingCost = lightingMeters * LIGHTING_PRICE_PER_METER;

    // قيمة الرخام = سعر المتر × عدد الأمتار — لا تُضاف إلا إذا أُدخلت القيم
    const marbleTotal = marblePrice * marbleMeters;

    const total = lowerCost + upperCost + tallCost + heightCost + gasStrutCost + lightingCost + kitchenAdditions + marbleTotal;
    return { lowerCost, upperCost, tallCost, heightCost, heightLabel, gasStrutCost, lightingCost, kitchenAdditions, marblePrice, marbleMeters, marbleTotal, total };
  }, [form.lowerMeters, form.upperMeters, form.tallMeters, form.heightOption, form.heightMeters, form.gasStrutCount, form.lightingMeters, form.kitchenAdditions, form.marblePrice, form.marbleMeters]);

  // حفظ عرض السعر داخل الجلسة الحالية فقط (بدون Server وبدون تخزين دائم)
  const saveQuote = () => {
    setSaveErr(null);
    setSaveMsg(null);
    try {
      const id = `quote-${Date.now()}`;
      const payload = { id, ...form, ...calc, createdAt: new Date().toISOString() };
      setQuotes((prev) => [payload, ...prev]);
      setSaveMsg('تم حفظ عرض السعر لهذه الجلسة بنجاح');
    } catch (_) {
      setSaveErr('تعذر حفظ عرض السعر، حاول مرة أخرى');
    } finally {
      setTimeout(() => { setSaveMsg(null); setSaveErr(null); }, 3000);
    }
  };

  // انتظار تحميل كل الصور داخل عنصر معيّن قبل التصوير (لضمان ظهور الشعار)
  const waitForImages = (root) => {
    const imgs = Array.from(root.querySelectorAll('img'));
    return Promise.all(
      imgs.map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        });
      })
    );
  };

  // إنشاء PDF لعرض سعر محدد وفتحه مباشرة في تبويب جديد
  const handlePrintQuote = useCallback((q) => {
    setPrintErrId(null);
    setPrintingId(q.id);

    // نفتح نافذة فارغة فورًا (ضمن نفس تفاعل المستخدم) لتفادي حجب المتصفح للنوافذ المنبثقة،
    // ثم نضع فيها رابط الـPDF بعد تجهيزه.
    let win = null;
    try {
      win = window.open('', '_blank');
    } catch (_) {
      win = null;
    }
    printWindowRef.current = win;

    setPrintQuote(q);
  }, []);

  // بعد تحديث printQuote، ينتظر المكوّن رسم القالب الخفي ثم يصوّره وينشئ PDF
  useEffect(() => {
    if (!printQuote) return;

    let cancelled = false;

    const run = async () => {
      try {
        // إطاران متتاليان لضمان اكتمال التخطيط (layout) قبل التصوير
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const node = printRef.current;
        if (!node) throw new Error('no-node');

        await waitForImages(node);

        const canvas = await html2canvas(node, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#FFFFFF',
        });

        if (cancelled) return;

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const imgWidthMm = pageWidth;
        const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;

        if (imgHeightMm <= pageHeight) {
          pdf.addImage(imgData, 'JPEG', 0, 0, imgWidthMm, imgHeightMm);
        } else {
          // في حال تجاوز المحتوى صفحة واحدة، نوزّعه على عدة صفحات
          let heightLeft = imgHeightMm;
          let position = 0;
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidthMm, imgHeightMm);
          heightLeft -= pageHeight;
          while (heightLeft > 0) {
            position -= pageHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidthMm, imgHeightMm);
            heightLeft -= pageHeight;
          }
        }

        const fileName = `عرض-سعر-${(printQuote.customerName || 'عميل').trim() || 'عميل'}.pdf`;
        const blobUrl = pdf.output('bloburl');

        const win = printWindowRef.current;
        if (win && !win.closed) {
          win.location.href = blobUrl;
        } else {
          // إن مُنعت النافذة المنبثقة، نفتح واحدة جديدة مباشرة كخطة بديلة
          window.open(blobUrl, '_blank');
        }
        // إتاحة تنزيل الملف أيضًا باسم واضح (لا يمنع فتحه في التبويب أعلاه)
        void fileName;
      } catch (err) {
        if (!cancelled) {
          setPrintErrId(printQuote.id);
          const win = printWindowRef.current;
          if (win && !win.closed) win.close();
        }
      } finally {
        if (!cancelled) {
          setPrintingId(null);
          setPrintQuote(null);
        }
      }
    };

    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printQuote]);

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAF6F0] text-[#2B1F17] pb-20 lg:pb-10" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
      {/* Header + drawer tabs */}
      <header className="sticky top-0 z-20 bg-[#FAF6F0]/95 backdrop-blur border-b border-[#E4D9C8]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] tracking-widest text-[#A87C2A] font-semibold mb-1">نظام إدارة مطابخ</p>
              <h1 className="font-display text-xl sm:text-2xl font-extrabold text-[#2E1F17]">التسعير · المتابعة · التشغيل</h1>
            </div>
            <div className="hidden sm:flex h-11 items-center justify-center shrink-0">
              <img
                src={LOGO_SRC}
                alt="المنى للمطابخ"
                className="h-11 w-auto object-contain"
              />
            </div>
          </div>

          <div className="flex gap-1.5">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative flex-1 pt-3.5 pb-3 px-2 sm:px-5 rounded-t-xl border border-b-0 transition-all ${
                    active
                      ? 'bg-white border-[#E4D9C8] shadow-[0_-6px_14px_-6px_rgba(74,52,39,0.15)]'
                      : 'bg-[#F0E4D2] border-transparent translate-y-1 hover:bg-[#F4EADC]'
                  }`}
                >
                  <span
                    className={`absolute top-1.5 left-1/2 -translate-x-1/2 h-1 rounded-full transition-all ${
                      active ? 'w-8 bg-[#A87C2A]' : 'w-5 bg-[#C89B6C]/70'
                    }`}
                  />
                  <span className="flex items-center justify-center gap-1.5 mt-1.5">
                    <t.icon className={`w-4 h-4 ${active ? 'text-[#A87C2A]' : 'text-[#8A7A68]'}`} />
                    <span className={`text-[13px] font-medium ${active ? 'text-[#2E1F17] font-bold' : 'text-[#6B5B4B]'}`}>
                      {t.label}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        {tab === 'pricing' && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
            {/* form column */}
            <div>
              <Section icon={User} title="بيانات العميل">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <Field label="اسم العميل" type="text" value={form.customerName} onChange={update('customerName')} placeholder="اكتب الاسم..." />
                  <Field label="رقم الهاتف" type="tel" inputMode="tel" value={form.phone} onChange={update('phone')} placeholder="05xxxxxxxx" />
                </div>
                <Field label="التاريخ" type="date" value={form.date} onChange={update('date')} />
              </Section>

              <Section icon={Ruler} step="1" title="أمتار الخزائن السفلية" subtitle="عدد الأمتار × 0.67 × سعر المتر">
                <Field label="عدد الأمتار" value={form.lowerMeters} onChange={update('lowerMeters')} suffix="م" />
              </Section>



              <Section icon={Ruler} step="2" title="أمتار الخزائن العلوية" subtitle="عدد الأمتار × 0.33 × سعر المتر">
                <Field label="عدد الأمتار" value={form.upperMeters} onChange={update('upperMeters')} suffix="م" />
              </Section>

              <Section icon={Ruler} step="3" title="أمتار الوحدات الطولية" subtitle="عدد الأمتار × 1.5 × سعر المتر">
                <Field label="عدد الأمتار" value={form.tallMeters} onChange={update('tallMeters')} suffix="م" />
              </Section>

              <Section
  icon={ArrowUpWideNarrow}
  step="4"
  title="زيادة الارتفاع"
  subtitle="ستاندرد = لا يُضاف شيء"
>
  <div className="flex flex-wrap gap-2 mb-3">
    <Pill
      active={form.heightOption === 'standard'}
      onClick={() => {
        update('heightOption')('standard');
        update('heightMeters')('');
      }}
    >
      ستاندرد
    </Pill>

    <Pill
      active={form.heightOption === 'r1'}
      onClick={() => {
        update('heightOption')('r1');
        update('heightMeters')('');
      }}
    >
      73 – 100 سم
    </Pill>

    <Pill
      active={form.heightOption === 'r2'}
      onClick={() => {
        update('heightOption')('r2');
        update('heightMeters')('');
      }}
    >
      101 – 140 سم
    </Pill>
  </div>

  {form.heightOption !== 'standard' && (
    <Field
      label="عدد الأمتار التي زاد ارتفاعه(ادخل القيمة بال cm)"
      type="text"
      inputMode="decimal"
      value={form.heightMeters}
      onChange={update('heightMeters')}
      suffix="م"
      placeholder={
        form.heightOption === 'r1'
          ? '0.73 – 1.00'
          : '1.01 – 1.40'
      }
      onBlur={() => {
        const value = form.heightMeters;

        if (value === '') return;

        const num = Number(value);

        if (Number.isNaN(num)) {
          update('heightMeters')('');
          return;
        }

        if (form.heightOption === 'r1') {
          if (num < 0.73) {
            update('heightMeters')('0.73');
          } else if (num > 1.00) {
            update('heightMeters')('1.00');
          }
        }

        if (form.heightOption === 'r2') {
          if (num < 1.01) {
            update('heightMeters')('1.01');
          } else if (num > 1.40) {
            update('heightMeters')('1.40');
          }
        }
      }}
    />
  )}
</Section>

              <Section icon={Sparkles} step="5" title="عدد الجكات">
                <Field label="عدد الجكات" value={form.gasStrutCount} onChange={update('gasStrutCount')} suffix="جك" />
              </Section>

              <Section icon={Lightbulb} step="6" title="الإنارة">
                <Field label="عدد أمتار الإنارة" value={form.lightingMeters} onChange={update('lightingMeters')} suffix="م" />
              </Section>

              <Section icon={Plus} step="7" title="إضافات في المطبخ" subtitle="قيمة تُدخل يدويًا مؤقتًا لحين تحديد بنودها وأسعارها">
                <Field label="قيمة الإضافات" value={form.kitchenAdditions} onChange={update('kitchenAdditions')} suffix="ريال" />
              </Section>

              <Section icon={Wrench} title="مواصفات إضافية" subtitle="بيانات تُنقل إلى شاشة التشغيل — لا تُضاف للسعر">
                <span className="block text-xs font-medium text-[#6B5B4B] mb-1.5">نظام المقبض</span>
                <div className="flex gap-2 mb-4">
                  <Pill active={form.handleSystem === 'hidden'} onClick={() => update('handleSystem')('hidden')}>مخفي</Pill>
                  <Pill active={form.handleSystem === 'normal'} onClick={() => update('handleSystem')('normal')}>عادي</Pill>
                </div>

                {form.handleSystem === 'hidden' ? (
                  <SelectField label="اللون" value={form.handleColor} onChange={update('handleColor')} options={HANDLE_COLOR_OPTIONS} />
                ) : (
                  <SelectField label="كود المقبض" value={form.handleCode} onChange={update('handleCode')} options={HANDLE_CODE_OPTIONS} />
                )}
              </Section>
                            <Section icon={Gem} title="الرخام" subtitle="اختر نوع الرخام لإظهار باقي الحقول">
                <div className="mb-3">
                  <SelectField
                    label="نوع الرخام"
                    value={form.marbleType}
                    onChange={update('marbleType')}
                    options={[
                      { value: '', label: 'اختر نوع الرخام' },
                      ...MARBLE_TYPE_OPTIONS.map((o) => ({ value: o, label: o })),
                    ]}
                  />
                </div>
                {form.marbleType && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="كود الرخام" type="text" value={form.marbleCode} onChange={update('marbleCode')} placeholder="مثال: ST-205" />
                    <Field label="سعر الرخام / متر" value={form.marblePrice} onChange={update('marblePrice')} suffix="ريال" />
                    <Field label="عدد أمتار الرخام" value={form.marbleMeters} onChange={update('marbleMeters')} suffix="م" />
                  </div>
                )}
              </Section>
            </div>

            {/* summary column */}
            <div className="lg:sticky lg:top-[168px] h-fit">
              <div className="bg-white rounded-2xl border border-[#E4D9C8] shadow-sm p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Layers className="w-4 h-4 text-[#A87C2A]" />
                  <h3 className="font-display font-bold text-[15px] text-[#2E1F17]">ملخص عرض السعر</h3>
                </div>
                <p className="text-[11px] text-[#8A7A68] mb-3">
                  {form.customerName || 'بدون اسم عميل'}{form.phone ? ` · ${form.phone}` : ''}
                </p>

                <div className="divide-y divide-[#F0E6D8]">
                  <SummaryLine label="سعر أمتار الخزائن السفلية" value={calc.lowerCost} />
                  <SummaryLine label=" سعر أمتار الخزائن العلوية" value={calc.upperCost} />
                  <SummaryLine label="سعر أمتار الوحدات الطولية" value={calc.tallCost} />
                  <SummaryLine label="سعر الرخام" value={calc.marbleTotal}/>
                  {form.heightOption !== 'standard' && (
                    <SummaryLine label={calc.heightLabel} value={calc.heightCost} />
                  )}
                  <SummaryLine label="الجكات" value={calc.gasStrutCost} />
                  <SummaryLine label="الإنارة" displayText="هدية" />
                 
                </div>

                <div className="border-t-2 border-dashed border-[#E4D9C8] mt-2 pt-2">
                  <SummaryLine label="قيمة المطبخ" value={calc.total} strong />
                </div>

                <button
                  onClick={saveQuote}
                  className="w-full mt-4 flex items-center justify-center gap-2 rounded-lg bg-[#4A3427] hover:bg-[#3A281D] text-[#F3E7D6] text-sm font-bold py-2.5 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  حفظ عرض السعر
                </button>
                {saveMsg && (
                  <p className="flex items-center gap-1.5 text-[11px] text-[#5A7A4E] mt-2">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {saveMsg}
                  </p>
                )}
                {saveErr && (
                  <p className="flex items-center gap-1.5 text-[11px] text-[#B0432E] mt-2">
                    <AlertCircle className="w-3.5 h-3.5" /> {saveErr}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'followup' && (
          <div>
            <div className="mb-4">
              <h2 className="font-display text-lg font-bold text-[#2E1F17]">عروض الأسعار المحفوظة</h2>
              <p className="text-[12px] text-[#8A7A68] mt-0.5">
                تظهر هنا العروض المحفوظة خلال هذه الجلسة فقط — لا يتم تخزينها على أي خادم، وتُفقد عند إغلاق الصفحة أو تحديثها.
              </p>
            </div>

            {quotes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-[#E4D9C8] p-10 text-center">
                <ClipboardList className="w-8 h-8 text-[#C89B6C] mx-auto mb-3" />
                <p className="text-sm text-[#5A4C3E] font-medium">لا توجد عروض أسعار محفوظة بعد</p>
                <p className="text-[12px] text-[#A69682] mt-1">احفظ عرض سعر من شاشة التسعير ليظهر هنا</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quotes.map((q) => {
                  const isPrinting = printingId === q.id;
                  const hadError = printErrId === q.id;
                  return (
                    <div key={q.id} className="bg-white rounded-xl border border-[#E4D9C8] p-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-[#2E1F17]">{q.customerName || 'بدون اسم عميل'}</p>
                        <p className="text-[11px] text-[#A69682] mt-0.5">
                          {q.phone ? `${q.phone} · ` : ''}{q.date || ''}
                        </p>
                        {hadError && (
                          <p className="flex items-center gap-1 text-[10.5px] text-[#B0432E] mt-1">
                            <AlertCircle className="w-3 h-3" /> تعذر إنشاء الملف، حاول مرة أخرى
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-[#A87C2A] tabular-nums">{money(q.total)} ريال</p>
                        <button
                          type="button"
                          onClick={() => handlePrintQuote(q)}
                          disabled={isPrinting}
                          title="طباعة عرض السعر"
                          className="w-8 h-8 shrink-0 rounded-lg border border-[#E4D9C8] bg-[#FDFBF8] flex items-center justify-center text-[#8A7A68] hover:text-[#A87C2A] hover:border-[#C89B6C] transition-colors disabled:opacity-60"
                        >
                          {isPrinting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Printer className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'operations' && (
          <div className="bg-white rounded-2xl border border-dashed border-[#E4D9C8] p-10 text-center">
            <Factory className="w-8 h-8 text-[#C89B6C] mx-auto mb-3" />
            <p className="text-sm text-[#5A4C3E] font-medium">قسم التشغيل قيد الإعداد</p>
            <p className="text-[12px] text-[#A69682] mt-1 max-w-sm mx-auto">
              سيتم بناء هذه الشاشة عند استلام تفاصيلها وكيفية ربطها بشاشتي التسعير والمتابعة.
            </p>
          </div>
        )}
      </main>

      {/* mobile sticky total (pricing tab only) */}
      {tab === 'pricing' && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[#E4D9C8] px-4 py-3 flex items-center justify-between shadow-[0_-6px_16px_rgba(74,52,39,0.08)]">
          <span className="text-xs text-[#6B5B4B]">قيمة المطبخ</span>
          <span className="text-base font-bold text-[#A87C2A] tabular-nums">{money(calc.total)} ريال</span>
        </div>
      )}

      {/* قالب الطباعة الخفي — يُرسَم فقط عندما يوجد عرض قيد التجهيز للطباعة */}
      <PdfQuoteTemplate ref={printRef} quote={printQuote} />
    </div>
  );
}
