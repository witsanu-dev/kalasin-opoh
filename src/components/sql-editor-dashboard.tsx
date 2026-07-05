"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, Database, Terminal, FileCode2, Info, AlertTriangle, CheckCircle2, RotateCcw, Undo2, BookOpen } from "lucide-react";
import Editor from "@monaco-editor/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Swal from "sweetalert2";
import { DEFAULT_SQL_TEMPLATES } from "@/lib/utils/sql-defaults";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

const sqlScripts = [
  {
    id: "sync_beds",
    name: "ข้อมูลเตียง (Beds)",
    description: "ใช้ดึงข้อมูลเตียงจาก HIS",
    expectedColumns: [
      { key: "ward", label: "รหัสตึก" },
      { key: "ward_name", label: "ชื่อตึก" },
      { key: "total_bed", label: "จำนวนเตียงทั้งหมด" },
      { key: "occupied_bed", label: "เตียงที่มีผู้ป่วย" },
      { key: "available_bed", label: "เตียงว่าง" },
      { key: "occupancy_rate", label: "อัตราครองเตียง" },
      { key: "export_code", label: "รหัสมาตรฐาน" },
      { key: "is_icu", label: "ตึก ICU (1=ใช่, 0=ไม่ใช่)" }
    ]
  },
  {
    id: "sync_lr",
    name: "ข้อมูลห้องคลอด (LR)",
    description: "ใช้ดึงข้อมูลสูติกรรมจาก HIS",
    expectedColumns: [
      { key: "hospcode", label: "รหัส รพ." },
      { key: "hospital_name", label: "ชื่อ รพ." },
      { key: "waiting_labor", label: "รอคลอด" },
      { key: "normal_delivery", label: "คลอดปกติ" },
      { key: "cesarean_delivery", label: "ผ่าคลอด" },
      { key: "abortion", label: "แท้ง" },
      { key: "not_delivery", label: "ไม่คลอด" },
      { key: "total_case", label: "รวมทั้งหมด" }
    ]
  },
  {
    id: "sync_or",
    name: "ข้อมูลห้องผ่าตัด (OR)",
    description: "ใช้ดึงข้อมูลการผ่าตัดจาก HIS",
    expectedColumns: [
      { key: "room_available", label: "ห้องว่าง/รวม" },
      { key: "operating_count", label: "กำลังผ่าตัด" },
      { key: "waiting_count", label: "รอผ่าตัด" },
      { key: "completed_count", label: "เสร็จสิ้น" },
      { key: "cancelled_count", label: "ยกเลิก" },
      { key: "total_case_today", label: "รวมเคสวันนี้" }
    ]
  }
];

export function SqlEditorDashboard() {
  const [activeTab, setActiveTab] = useState(sqlScripts[0].id);
  const [sqlContent, setSqlContent] = useState("");
  const [originalSql, setOriginalSql] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    fetchSqlContent(activeTab);
  }, [activeTab]);

  const fetchSqlContent = async (type: string) => {
    try {
      setLoading(true);
      setIsDirty(false);
      const res = await fetch(`/api/sql-script?type=${type}`);
      const data = await res.json();
      if (res.ok && data.sql) {
        setSqlContent(data.sql);
        setOriginalSql(data.sql);
        setIsDirty(false);
      } else {
        // Fallback to default template if file doesn't exist yet
        const defaultSql = DEFAULT_SQL_TEMPLATES[type] || "";
        setSqlContent(defaultSql);
        setOriginalSql(defaultSql);
        setIsDirty(true); // Mark dirty so they know to save it
      }
    } catch (error) {
      console.error(error);
      setSqlContent("เกิดข้อผิดพลาดในการโหลดคำสั่ง SQL");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!sqlContent.trim()) {
      MySwal.fire('ข้อผิดพลาด', 'คำสั่ง SQL ว่างเปล่าไม่ได้', 'error');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/sql-script", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: activeTab,
          sql: sqlContent,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        MySwal.fire({
          title: 'บันทึกสำเร็จ!',
          text: 'อัปเดตคำสั่ง SQL เรียบร้อยแล้ว การซิงค์ครั้งต่อไปจะใช้คำสั่งนี้',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        setOriginalSql(sqlContent);
        setIsDirty(false);
      } else {
        MySwal.fire('ข้อผิดพลาด', data.error || 'ไม่สามารถบันทึกได้', 'error');
      }
    } catch (error: any) {
      MySwal.fire('ข้อผิดพลาด', error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    setSqlContent(originalSql);
    setIsDirty(false);
  };

  const handleResetToDefault = () => {
    MySwal.fire({
      title: 'ยืนยันการคืนค่าเริ่มต้น?',
      text: "การกระทำนี้จะลบคำสั่งที่คุณเขียนขึ้นเองทั้งหมด และแทนที่ด้วยคำสั่งมาตรฐาน (ต้องกดบันทึกอีกครั้งเพื่อใช้งานจริง)",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'ใช่, คืนค่าเริ่มต้น!',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        const defaultSql = DEFAULT_SQL_TEMPLATES[activeTab] || "";
        setSqlContent(defaultSql);
        setIsDirty(true); // Because it differs from originalSql (usually)
      }
    });
  };

  const showHisDictionary = async () => {
    try {
      MySwal.fire({
        title: 'กำลังดึงข้อมูลอ้างอิง...',
        text: 'กำลังเชื่อมต่อกับฐานข้อมูล HIS',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const res = await fetch('/api/his-dictionary');
      const json = await res.json();

      if (!json.success) throw new Error(json.error || 'Failed to fetch dictionary');

      const { operationStatus, laborStatus, laborType } = json.data;

      const generateTableRows = (items: any[]) => {
        return items.map(item => `
          <tr class="border-b border-slate-100">
            <td class="py-1.5 w-16 font-mono text-teal-600 font-bold">${item.id}</td>
            <td class="py-1.5 text-slate-600">${item.name}</td>
          </tr>
        `).join('');
      };

      const orHtml = `
        <div class="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div class="bg-slate-50 px-4 py-2 border-b border-slate-200 font-bold text-slate-700 flex items-center gap-2 text-sm">
            <span class="w-2.5 h-2.5 rounded-full bg-slate-400"></span> ห้องผ่าตัด (operation_list)
          </div>
          <div class="p-4 space-y-4 text-sm">
            <div>
              <h5 class="font-semibold text-slate-700 mb-2">status_id (สถานะการผ่าตัด)</h5>
              <table class="w-full text-left border-collapse text-sm">
                ${generateTableRows(operationStatus)}
              </table>
            </div>
          </div>
        </div>
      `;

      const lrHtml = `
        <div class="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div class="bg-slate-50 px-4 py-2 border-b border-slate-200 font-bold text-slate-700 flex items-center gap-2 text-sm">
            <span class="w-2.5 h-2.5 rounded-full bg-slate-400"></span> ห้องคลอด (person_anc)
          </div>
          <div class="p-4 space-y-4 text-sm">
            <div>
              <h5 class="font-semibold text-slate-700 mb-2">labor_status_id (สถานะการคลอด)</h5>
              <table class="w-full text-left border-collapse text-sm">
                ${generateTableRows(laborStatus)}
              </table>
            </div>
            <div class="pt-2 border-t border-slate-100">
              <h5 class="font-semibold text-slate-700 mb-2">labour_type_id (วิธีการคลอด)</h5>
              <table class="w-full text-left border-collapse text-sm">
                ${generateTableRows(laborType)}
              </table>
            </div>
          </div>
        </div>
      `;

      const bedsHtml = `
        <div class="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div class="bg-slate-50 px-4 py-2 border-b border-slate-200 font-bold text-slate-700 flex items-center gap-2 text-sm">
            <span class="w-2.5 h-2.5 rounded-full bg-slate-400"></span> ข้อมูลเตียง (ward / bedno)
          </div>
          <div class="p-4 space-y-4 text-sm">
            <div>
              <h5 class="font-semibold text-slate-700 mb-2">โครงสร้างความสัมพันธ์ที่สำคัญ</h5>
              <ul class="list-disc list-inside text-slate-600 space-y-1.5 leading-relaxed">
                <li><code class="text-[11px] font-mono bg-slate-100 border border-slate-200 px-1 py-0.5 rounded text-teal-600 font-bold">ward.ward_active = 'Y'</code> กรองเฉพาะตึกที่ยังเปิดใช้งาน</li>
                <li><code class="text-[11px] font-mono bg-slate-100 border border-slate-200 px-1 py-0.5 rounded text-teal-600 font-bold">ipt.dchdate IS NULL</code> กรองเฉพาะผู้ป่วยที่ยังไม่จำหน่าย (Admit อยู่)</li>
                <li>จำนวนเตียงทั้งหมด: ให้นับ <code class="text-[11px] font-mono bg-slate-100 border border-slate-200 px-1 py-0.5 rounded text-slate-700 font-bold">COUNT(DISTINCT bedno)</code></li>
              </ul>
            </div>
          </div>
        </div>
      `;

      let contentHtml = '';
      if (activeTab === 'sync_or') {
        contentHtml = orHtml;
      } else if (activeTab === 'sync_lr') {
        contentHtml = lrHtml;
      } else if (activeTab === 'sync_beds') {
        contentHtml = bedsHtml;
      } else {
        contentHtml = orHtml + lrHtml + bedsHtml;
      }

      MySwal.fire({
        title: '<div class="flex items-center gap-2 justify-center"><span class="text-xl font-bold text-slate-800 tracking-tight">คู่มือรหัสมาตรฐาน (Data Dictionary)</span></div>',
        html: `
          <div class="mt-4 text-left space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 pb-2">
            ${contentHtml}
          </div>
        `,
        showConfirmButton: true,
        confirmButtonText: 'ปิด',
        confirmButtonColor: '#475569',
        width: '640px',
        customClass: {
          popup: 'rounded-[16px] pb-4',
          title: 'pt-6',
          confirmButton: 'rounded-md px-8 mt-2'
        }
      });
    } catch (error) {
      MySwal.fire('ข้อผิดพลาด', 'ไม่สามารถดึงข้อมูลพจนานุกรมจาก HIS ได้', 'error');
    }
  };

  const handleEditorWillMount = (monaco: any) => {
    // Only register once by checking if we've added a custom property to the monaco instance
    if (!monaco.languages._opohSqlCompletionRegistered) {
      monaco.languages.registerCompletionItemProvider('sql', {
        provideCompletionItems: (model: any, position: any) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          const suggestions = [
            // Standard SQL Functions & Keywords as Snippets
            { label: 'SELECT', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'SELECT', range },
            { label: 'FROM', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'FROM', range },
            { label: 'WHERE', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'WHERE', range },
            { label: 'LEFT JOIN', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'LEFT JOIN', range },
            { label: 'GROUP BY', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'GROUP BY', range },
            { label: 'ORDER BY', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'ORDER BY', range },
            { label: 'CASE WHEN', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'CASE \n\tWHEN ${1:condition} THEN ${2:result}\n\tELSE ${3:0}\nEND', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },
            { label: 'COUNT', kind: monaco.languages.CompletionItemKind.Function, insertText: 'COUNT(${1:*})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },
            { label: 'SUM', kind: monaco.languages.CompletionItemKind.Function, insertText: 'SUM(${1:column})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },
            { label: 'IFNULL', kind: monaco.languages.CompletionItemKind.Function, insertText: 'IFNULL(${1:column}, ${2:0})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },
            { label: 'ROUND', kind: monaco.languages.CompletionItemKind.Function, insertText: 'ROUND(${1:value}, ${2:2})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },

            // OPOH/HOSxP Specific Fields
            { label: 'is_icu', kind: monaco.languages.CompletionItemKind.Property, insertText: 'is_icu', range },
            { label: 'ward', kind: monaco.languages.CompletionItemKind.Property, insertText: 'ward', range },
            { label: 'ward_name', kind: monaco.languages.CompletionItemKind.Property, insertText: 'ward_name', range },
            { label: 'total_bed', kind: monaco.languages.CompletionItemKind.Property, insertText: 'total_bed', range },
            { label: 'occupied_bed', kind: monaco.languages.CompletionItemKind.Property, insertText: 'occupied_bed', range },
            { label: 'available_bed', kind: monaco.languages.CompletionItemKind.Property, insertText: 'available_bed', range },
            { label: 'occupancy_rate', kind: monaco.languages.CompletionItemKind.Property, insertText: 'occupancy_rate', range },
            { label: 'export_code', kind: monaco.languages.CompletionItemKind.Property, insertText: 'export_code', range },
          ];

          return { suggestions };
        }
      });
      monaco.languages._opohSqlCompletionRegistered = true;
    }
  };

  const checkColumnExists = (key: string) => {
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    return regex.test(sqlContent);
  };

  const activeScriptInfo = sqlScripts.find((s) => s.id === activeTab);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-md shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center">
            <Terminal className="w-6 h-6 mr-2 text-slate-600" />
            ตั้งค่าคำสั่ง SQL (SQL Scripts)
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            ปรับแต่งคำสั่ง Query สำหรับดึงข้อมูลจาก HIS ของแต่ละโรงพยาบาลให้ตรงตามโครงสร้าง
          </p>
        </div>
        <div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={showHisDictionary}
              className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              title="คู่มือรหัสมาตรฐาน HIS"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              คู่มือรหัส HIS
            </Button>

            <Button
              variant="outline"
              onClick={handleResetToDefault}
              className="text-amber-500 border-amber-200 hover:bg-amber-50"
              disabled={loading || saving}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              คืนค่าเริ่มต้นมาตรฐาน
            </Button>

            {isDirty && (
              <Button
                variant="outline"
                onClick={handleDiscardChanges}
                className="w-48 text-slate-500"
              >
                <Undo2 className="w-4 h-4 mr-2" />
                ยกเลิกการแก้ไข
              </Button>
            )}

            <Button
              onClick={handleSave}
              disabled={loading || saving || !isDirty}
              className="w-48 bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-500/20"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saving ? "กำลังบันทึก..." : "บันทึกคำสั่ง SQL"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <Card className="rounded-md shadow-sm border border-slate-100 lg:col-span-1 h-fit">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center">
              <Database className="w-5 h-5 mr-2 text-teal-600" />
              เลือกข้อมูล
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex flex-col divide-y divide-slate-100">
              {sqlScripts.map((script) => (
                <button
                  key={script.id}
                  onClick={() => {
                    if (isDirty) {
                      MySwal.fire({
                        title: 'ยังไม่ได้บันทึกข้อมูล',
                        text: 'คุณต้องการทิ้งการเปลี่ยนแปลงนี้หรือไม่?',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'ใช่, เปลี่ยนหน้า',
                        cancelButtonText: 'ยกเลิก',
                        confirmButtonColor: '#ef4444',
                      }).then((result) => {
                        if (result.isConfirmed) {
                          setActiveTab(script.id);
                        }
                      });
                    } else {
                      setActiveTab(script.id);
                    }
                  }}
                  className={`text-left px-4 py-4 hover:bg-slate-50 transition-colors flex items-start gap-3 ${activeTab === script.id ? 'bg-teal-50/50 border-l-4 border-teal-600' : 'border-l-4 border-transparent'
                    }`}
                >
                  <FileCode2 className={`w-5 h-5 shrink-0 mt-0.5 ${activeTab === script.id ? 'text-teal-600' : 'text-slate-400'}`} />
                  <div>
                    <div className={`font-semibold text-sm ${activeTab === script.id ? 'text-teal-700' : 'text-slate-700'}`}>
                      {script.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{script.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Editor Area */}
        <Card className="rounded-md shadow-sm border border-slate-100 lg:col-span-3">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center">
                  แก้ไขคำสั่ง - {activeScriptInfo?.name}
                </CardTitle>
                <CardDescription className="text-sm text-slate-500 mt-1">
                  ไฟล์: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono text-xs">{activeTab}.sql</code>
                </CardDescription>
              </div>
              {isDirty && (
                <span className="flex items-center text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                  <AlertTriangle className="w-3 h-3 mr-1" /> มีการแก้ไข
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Expected Columns Info */}
            <div className="bg-slate-50 border-b border-slate-200 p-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-slate-500 shrink-0" />
                  <h4 className="text-sm font-bold text-slate-700">โครงสร้างข้อมูลมาตรฐาน</h4>
                </div>
                <div className="flex flex-wrap gap-2 pl-7">
                  {activeScriptInfo?.expectedColumns.map((col, idx) => {
                    const isFound = checkColumnExists(col.key);
                    return (
                      <span
                        key={idx}
                        className={`inline-flex items-center text-xs font-medium px-2.5 py-1.5 rounded-md shadow-sm border transition-all duration-300 ${isFound
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-white text-slate-400 border-slate-200'
                          }`}
                      >
                        {isFound ? (
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                        )}
                        <span className="font-mono font-bold mr-1">{col.key}</span>
                        <span className={`text-[10px] ${isFound ? 'text-emerald-600/70' : 'text-slate-400'}`}>({col.label})</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Editor */}
            <div className="relative h-[500px] w-full bg-slate-900 overflow-hidden group">
              {loading && (
                <div className="absolute inset-0 z-10 bg-slate-900/50 flex flex-col items-center justify-center text-teal-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <span className="text-sm font-medium">กำลังโหลด...</span>
                </div>
              )}

              <div className="absolute top-2 right-4 z-10">
                <span className="text-xs font-medium text-slate-500 bg-slate-800/80 px-2 py-1 rounded border border-slate-700">
                  SQL
                </span>
              </div>

              <Editor
                height="100%"
                language="sql"
                theme="vs-dark"
                value={sqlContent}
                beforeMount={handleEditorWillMount}
                onChange={(value) => {
                  setSqlContent(value || "");
                  setIsDirty(true);
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: "on",
                  scrollBeyondLastLine: false,
                  lineNumbers: "on",
                  renderLineHighlight: "all",
                  padding: { top: 16, bottom: 16 },
                  quickSuggestions: true,
                  suggestOnTriggerCharacters: true,
                  acceptSuggestionOnEnter: "on",
                  tabCompletion: "on",
                }}
                loading={
                  <div className="flex flex-col items-center justify-center text-teal-400 h-full w-full bg-slate-900">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <span className="text-sm font-medium">กำลังโหลด Editor...</span>
                  </div>
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
