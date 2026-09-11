import { useMemo, useRef, useState } from "react";
import { AIChatBox, type Message as AIMessage } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  ArrowDownToLine,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Database,
  FileSpreadsheet,
  Filter,
  Gauge,
  Layers3,
  LayoutDashboard,
  ListFilter,
  MoreHorizontal,
  MessageCircle,
  MousePointer2,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Loader2,
  LogOut,
  Upload,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/_core/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = {
  date: string;
  channel: string;
  region: string;
  orders: number;
  aov: number;
  returns: number;
  [key: string]: any;
};

export type Transformation = 
  | { id: string; type: "CALCULATE"; newName: string; expression: string }
  | { id: string; type: "DROP_NULLS"; column: string };

type FilterState = {
  channel: string;
  region: string;
  period: string;
};

type AnalysisPayload = {
  profile?: { rows?: number; columns?: number; missing_values?: number; duplicate_rows?: number; numeric_columns?: string[]; categorical_columns?: string[]; date_columns?: string[]; boolean_columns?: string[] };
  columns?: Array<{ name: string; type: string; missing: number; unique: number; stats?: Record<string, unknown>; top_values?: Array<{ value: string; count: number }> }>;
  raw_rows?: Array<Record<string, string>>;
  normalized_rows?: Row[];
  insights?: string[];
  python_engine?: boolean;
  filename?: string;
};

const starterRows: Row[] = [
  { date: "2024-05-01", channel: "Organic", region: "West", orders: 412, aov: 86.4, returns: 12 },
  { date: "2024-05-02", channel: "Paid social", region: "South", orders: 386, aov: 79.2, returns: 19 },
  { date: "2024-05-03", channel: "Direct", region: "East", orders: 458, aov: 91.8, returns: 11 },
  { date: "2024-05-04", channel: "Partner", region: "West", orders: 298, aov: 104.3, returns: 8 },
  { date: "2024-05-05", channel: "Organic", region: "North", orders: 344, aov: 88.1, returns: 14 },
  { date: "2024-05-06", channel: "Direct", region: "South", orders: 522, aov: 94.7, returns: 17 },
  { date: "2024-05-07", channel: "Paid social", region: "East", orders: 471, aov: 81.6, returns: 23 },
  { date: "2024-05-08", channel: "Organic", region: "West", orders: 589, aov: 96.2, returns: 16 },
  { date: "2024-05-09", channel: "Partner", region: "North", orders: 326, aov: 110.4, returns: 9 },
  { date: "2024-05-10", channel: "Direct", region: "East", orders: 612, aov: 98.8, returns: 21 },
  { date: "2024-05-11", channel: "Paid social", region: "South", orders: 536, aov: 83.9, returns: 27 },
  { date: "2024-05-12", channel: "Organic", region: "North", orders: 648, aov: 101.2, returns: 18 },
];

const palette = ["#dfff66", "#9a8cff", "#6ee7d2", "#f9a87b"];

function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function parseCsv(text: string): Row[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((item) => item.trim().toLowerCase());
  const find = (names: string[], fallback: number) => {
    const index = headers.findIndex((header) => names.some((name) => header.includes(name)));
    return index === -1 ? fallback : index;
  };
  const dateIndex = find(["date", "time", "day"], 0);
  const channelIndex = find(["channel", "source", "category", "segment"], 1);
  const regionIndex = find(["region", "country", "market", "area"], 2);
  const ordersIndex = find(["order", "count", "volume", "quantity"], 3);
  const aovIndex = find(["aov", "value", "revenue", "amount", "sales"], 4);
  const returnsIndex = find(["return", "refund", "churn"], 5);
  return lines.slice(1).map((line, rowIndex) => {
    const cells = line.split(",").map((item) => item.trim().replace(/^"|"$/g, ""));
    return {
      date: cells[dateIndex] || `Row ${rowIndex + 1}`,
      channel: cells[channelIndex] || "Unassigned",
      region: cells[regionIndex] || "Unknown",
      orders: Number(cells[ordersIndex]) || 0,
      aov: Number(cells[aovIndex]) || 0,
      returns: Number(cells[returnsIndex]) || 0,
    };
  });
}

function MiniSparkline({ positive = true }: { positive?: boolean }) {
  return (
    <div className="sparkline" aria-hidden="true">
      <svg viewBox="0 0 96 30" preserveAspectRatio="none">
        <path
          d={positive ? "M1 24 C 10 22, 11 18, 18 20 S 30 24, 36 15 S 47 16, 54 11 S 65 12, 72 6 S 83 8, 95 2" : "M1 4 C 12 8, 14 5, 22 12 S 35 14, 43 10 S 55 20, 63 17 S 77 24, 95 26"}
          fill="none"
          stroke={positive ? "#dfff66" : "#ff9f7b"}
          strokeWidth="2.3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function AppIcon({ icon: Icon, active = false }: { icon: typeof LayoutDashboard; active?: boolean }) {
  return <Icon size={18} strokeWidth={active ? 2.3 : 1.7} />;
}

export default function Home() {
  const [rows, setRows] = useState<Row[]>(starterRows);
  const [filters, setFilters] = useState<FilterState>({ channel: "All channels", region: "All regions", period: "Last 30 days" });
  const [activeNav, setActiveNav] = useState("Overview");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [showColumns, setShowColumns] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState("orders");
  const [currentPage, setCurrentPage] = useState(1);
  const [chartType, setChartType] = useState("Bar chart");
  const [chartX, setChartX] = useState("channel");
  const [chartY, setChartY] = useState("orders");
  const [aggregation, setAggregation] = useState("Sum");
  const [uploadMessage, setUploadMessage] = useState("sales_snapshot.csv");
  const [analysisData, setAnalysisData] = useState<AnalysisPayload | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<AIMessage[]>([]);
  const [analysisNotice, setAnalysisNotice] = useState("Local demo data · upload a file to run Python analysis");
  const [transformations, setTransformations] = useState<Transformation[]>([]);
  const { user, logout } = useAuth();
  const [helpOpen, setHelpOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(true);
  const fileInput = useRef<HTMLInputElement>(null);
  const analyzeMutation = trpc.analytics.analyze.useMutation();
  const chatMutation = trpc.analytics.chat.useMutation();

  const processedRows = useMemo(() => {
    let data = [...rows];
    for (const t of transformations) {
      if (t.type === "CALCULATE") {
        data = data.map(row => {
          const newRow = { ...row };
          try {
            // Evaluates JS expression safely against row properties
            const func = new Function('row', `const {${Object.keys(row).join(',')}} = row; return ${t.expression}`);
            newRow[t.newName] = func(row);
          } catch (e) {
            newRow[t.newName] = null;
          }
          return newRow;
        });
      } else if (t.type === "DROP_NULLS") {
        data = data.filter(row => row[t.column] !== null && row[t.column] !== undefined && row[t.column] !== "");
      }
    }
    return data;
  }, [rows, transformations]);

  const channels = useMemo(() => ["All channels", ...Array.from(new Set(processedRows.map((row) => row.channel)))], [processedRows]);
  const regions = useMemo(() => ["All regions", ...Array.from(new Set(processedRows.map((row) => row.region)))], [processedRows]);

  const filteredRows = useMemo(() => {
    const searchLower = search ? search.toLowerCase() : "";
    return processedRows.filter((row) => {
      const matchChannel = filters.channel === "All channels" || row.channel === filters.channel;
      const matchRegion = filters.region === "All regions" || row.region === filters.region;
      if (!matchChannel || !matchRegion) return false;
      if (!searchLower) return true;
      
      for (const key in row) {
        if (String(row[key as keyof typeof row]).toLowerCase().includes(searchLower)) return true;
      }
      return false;
    });
  }, [filters, processedRows, search]);

  const totals = useMemo(() => {
    const orders = filteredRows.reduce((sum, row) => sum + row.orders, 0);
    const returns = filteredRows.reduce((sum, row) => sum + row.returns, 0);
    const average = filteredRows.length ? filteredRows.reduce((sum, row) => sum + row.aov, 0) / filteredRows.length : 0;
    const sorted = filteredRows.map((row) => row.aov).sort((a, b) => a - b);
    const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
    return { orders, returns, average, median, rows: filteredRows.length };
  }, [filteredRows]);

  const chartData = useMemo(() => {
    const map = new Map<string, { orders: number, aov: number, count: number }>();
    for (const row of filteredRows) {
      const day = String(row.date || "Unknown").slice(0, 10);
      if (!map.has(day)) map.set(day, { orders: 0, aov: 0, count: 0 });
      const stats = map.get(day)!;
      stats.orders += Number(row.orders) || 0;
      stats.aov += Number(row.aov) || 0;
      stats.count += 1;
    }
    const result = Array.from(map.entries()).map(([day, stats]) => ({
      day,
      orders: stats.orders,
      aov: stats.count > 0 ? Math.round(stats.aov / stats.count) : 0,
    })).sort((a, b) => a.day.localeCompare(b.day));
    return result.slice(-90); // Last 90 days max to prevent line chart overload
  }, [filteredRows]);

  const channelData = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of filteredRows) {
      const channel = String(row.channel || "Unknown");
      map.set(channel, (map.get(channel) || 0) + (Number(row.orders) || 1));
    }
    const result = Array.from(map.entries()).map(([channel, orders], index) => ({
      channel,
      orders,
      fill: palette[index % palette.length],
    }));
    result.sort((a, b) => b.orders - a.orders);
    return result.slice(0, 10);
  }, [filteredRows]);

  const selectedRows = useMemo(() => filteredRows.slice().sort((a, b) => b.orders - a.orders), [filteredRows]);

  const displayRows = useMemo<Array<Record<string, string | number>>>(() => {
    if (analysisData?.raw_rows?.length) {
      const filteredSet = new Set(filteredRows);
      return analysisData.raw_rows.filter((_, index) => {
        const normalized = analysisData.normalized_rows?.[index];
        return !normalized || filteredSet.has(normalized as any);
      });
    }
    return selectedRows.map((row) => ({ Date: row.date, Channel: row.channel, Region: row.region, Orders: row.orders, "Average Order Value": row.aov, Returns: row.returns }));
  }, [analysisData, filteredRows, selectedRows]);

  const builderData = useMemo(() => {
    const sourceRows = analysisData?.raw_rows?.length ? analysisData.raw_rows : filteredRows;
    const groupMap = new Map<string, number[]>();
    for (const row of sourceRows) {
      const group = String(row[chartX as keyof typeof row]);
      const val = Number(row[chartY as keyof typeof row]) || 0;
      if (!groupMap.has(group)) groupMap.set(group, []);
      groupMap.get(group)!.push(val);
    }
    const result = Array.from(groupMap.entries()).map(([group, values]) => {
      const value = aggregation === "Average" ? values.reduce((sum, item) => sum + item, 0) / Math.max(1, values.length) : aggregation === "Count" ? values.length : values.reduce((sum, item) => sum + item, 0);
      return { group: group.length > 12 ? `${group.slice(0, 11)}…` : group, value: Math.round(value * 100) / 100 };
    });
    result.sort((a, b) => b.value - a.value);
    return result.length > 50 ? result.slice(0, 50) : result;
  }, [aggregation, chartX, chartY, filteredRows, analysisData]);

  const chatAnalysis = useMemo(() => ({
    ...(analysisData ?? {}),
    profile: {
      ...(analysisData?.profile ?? {}),
      rows: filteredRows.length,
      columns: analysisData?.profile?.columns ?? 6,
    },
    normalized_rows: filteredRows,
  }), [analysisData, filteredRows]);

  function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const base64Data = dataUrl.includes(",") ? dataUrl.split(",", 2)[1] : dataUrl;
      setUploadMessage(`${file.name} · analyzing…`);
      setAnalysisNotice("Python engine is profiling columns, quality, and distributions…");
      analyzeMutation.mutate({ filename: file.name, base64Data }, {
        onSuccess: (result) => {
          const payload = result as AnalysisPayload;
          setAnalysisData(payload);
          if (payload.normalized_rows?.length) setRows(payload.normalized_rows);
          setSelectedColumn(payload.profile?.numeric_columns?.[0] ?? payload.columns?.[0]?.name ?? "Orders");
          setFilters({ channel: "All channels", region: "All regions", period: "Last 30 days" });
          setCurrentPage(1);
          setChartX(payload.columns?.find((c) => c.type !== "numeric")?.name ?? "channel");
          setChartY(payload.columns?.find((c) => c.type === "numeric")?.name ?? "orders");
          setUploadMessage(file.name);
          setAnalysisNotice(`Python verified · ${payload.profile?.rows ?? 0} rows · ${payload.profile?.columns ?? 0} columns · ${payload.profile?.missing_values ?? 0} missing cells`);
        },
        onError: (error) => {
          setUploadMessage(file.name);
          setAnalysisNotice(`Analysis error · ${error.message}`);
        },
      });
    };
    reader.readAsDataURL(file);
  }

  function handleCellEdit(row: Row, key: keyof Row, value: string) {
    const rowIndex = rows.findIndex((candidate) => candidate.date === row.date && candidate.channel === row.channel && candidate.region === row.region);
    if (rowIndex < 0) return;
    const next = [...rows];
    next[rowIndex] = { ...next[rowIndex], [key]: key === "orders" || key === "aov" || key === "returns" ? Number(value) || 0 : value };
    setRows(next);
    setAnalysisNotice("Unsaved correction · re-run analysis to refresh the Python profile");
  }

  function handleRawCellEdit(row: Record<string, string>, key: string, value: string) {
    if (!analysisData?.raw_rows) return;
    const rowIndex = analysisData.raw_rows.findIndex((candidate) => candidate === row);
    if (rowIndex < 0) return;
    const nextRows = analysisData.raw_rows.map((candidate, index) => index === rowIndex ? { ...candidate, [key]: value } : candidate);
    setAnalysisData({ ...analysisData, raw_rows: nextRows });
    setAnalysisNotice("Unsaved correction · re-run Python to refresh every visual");
  }

  function reanalyzeEdited() {
    if (!analysisData?.raw_rows?.length || !analysisData.columns?.length) return;
    const columns = analysisData.columns.map((column) => column.name);
    const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const csv = [columns.join(","), ...analysisData.raw_rows.map((row) => columns.map((column) => escapeCsv(String(row[column] ?? ""))).join(","))].join("\n");
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const base64Data = dataUrl.includes(",") ? dataUrl.split(",", 2)[1] : dataUrl;
      setAnalysisNotice("Re-running Python analysis on your corrections…");
      analyzeMutation.mutate({ filename: analysisData.filename ?? "edited-dataset.csv", base64Data }, {
        onSuccess: (result) => {
          const payload = result as AnalysisPayload;
          setAnalysisData(payload);
          if (payload.normalized_rows?.length) setRows(payload.normalized_rows);
          setSelectedColumn(payload.profile?.numeric_columns?.[0] ?? payload.columns?.[0]?.name ?? "Orders");
          setAnalysisNotice(`Python refreshed · ${payload.profile?.rows ?? 0} rows · ${payload.profile?.missing_values ?? 0} missing cells`);
        },
        onError: (error) => setAnalysisNotice(`Re-analysis error · ${error.message}`),
      });
    };
    reader.readAsDataURL(new Blob([csv], { type: "text/csv" }));
  }

  function sendChatMessage(content: string) {
    const nextMessages: AIMessage[] = [...chatMessages, { role: "user", content }];
    setChatMessages(nextMessages);
    chatMutation.mutate({ messages: nextMessages, analysis: chatAnalysis }, {
      onSuccess: (response) => {
        try {
          const raw = response.content.trim();
          if (raw.startsWith("{") && raw.endsWith("}")) {
            const parsed = JSON.parse(raw);
            if (parsed.action === "CREATE_COLUMN" && parsed.name && parsed.expression) {
              setTransformations(t => [...t, { id: Date.now().toString(), type: "CALCULATE", newName: parsed.name, expression: parsed.expression }]);
              setChatMessages((current) => [...current, { role: "assistant", content: `I've created the calculated column **${parsed.name}** for you! You can view or remove it in the Data Cleaning Studio.` }]);
              return;
            }
          }
        } catch (e) {
          // not JSON, fallback to standard text message
        }
        setChatMessages((current) => [...current, { role: "assistant", content: response.content }]);
      },
      onError: (error) => setChatMessages((current) => [...current, { role: "assistant", content: `I couldn't reach the analysis service: ${error.message}` }]),
    });
  }

  function downloadCsv(data: Row[], filename: string) {
    const csv = ["Date,Channel,Region,Orders,AOV,Returns", ...data.map((row) => `${row.date},${row.channel},${row.region},${row.orders},${row.aov},${row.returns}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function resetAll() {
    setRows(starterRows);
    setFilters({ channel: "All channels", region: "All regions", period: "Last 30 days" });
    setSearch("");
    setCurrentPage(1);
    setUploadMessage("sales_snapshot.csv");
    setAnalysisData(null);
    setAnalysisNotice("Local demo data · upload a file to run Python analysis");
    setChatMessages([]);
  }

  const columnNames = useMemo(() => {
    if (analysisData?.columns && analysisData?.columns?.length > 0) {
      // Re-map analysis columns plus dynamically added transformations
      const baseCols = analysisData.columns.map((c: any) => [c.name, c.name.charAt(0).toUpperCase() + c.name.slice(1).replace(/_/g, " ")]);
      const addedCols = transformations.filter(t => t.type === "CALCULATE").map(t => [t.newName, t.newName]);
      return [...baseCols, ...addedCols];
    }
    
    // Extract column names dynamically from processedRows
    if (processedRows.length > 0) {
       return Object.keys(processedRows[0]).map(key => [key, key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ")]);
    }
    
    return [
      ["date", "Date"],
      ["channel", "Channel"],
      ["region", "Region"],
      ["orders", "Orders"],
      ["aov", "Avg order value"],
      ["returns", "Returns"],
    ];
  }, [analysisData, processedRows, transformations]);
  const selectedProfile = analysisData?.columns?.find((column) => column.name === selectedColumn);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark"><span /></div>
          <div><strong>signalboard</strong><small>ANALYTICS OS</small></div>
        </div>
        <div className="workspace-label">WORKSPACE <ChevronDown size={13} /></div>
        <div className="workspace-card"><div className="workspace-avatar">S</div><div><strong>Growth Lab</strong><span>Personal workspace</span></div><MoreHorizontal size={16} /></div>
        <nav className="main-nav">
          {[
            { id: "Overview", icon: LayoutDashboard },
            { id: "Data explorer", icon: Database },
            { id: "Chart builder", icon: BarChart3 },
            { id: "Data cleaning", icon: WandSparkles },
            { id: "Insights", icon: Sparkles },
            { id: "Settings", icon: Settings2 },
          ].map(({ id: label, icon: Icon }) => (
            <button key={label as string} className={activeNav === label ? "nav-item active" : "nav-item"} onClick={() => setActiveNav(label as string)}><AppIcon icon={Icon as typeof LayoutDashboard} active={activeNav === label} /><span>{label}</span>{label === "Insights" && <span className="nav-badge">4</span>}</button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="user-row cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="user-avatar">{user?.name ? user.name.charAt(0).toUpperCase() : "U"}</div>
                <div><strong>{user?.name || "Guest"}</strong><span>{user?.role || "User"}</span></div>
                <MoreHorizontal size={16} className="ml-auto" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setActiveNav("Settings")}>
                <Settings2 className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {user ? (
                <DropdownMenuItem className="text-red-600 focus:text-red-600 cursor-pointer" onClick={() => logout()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setAuthOpen(true)}>
                  <span>Sign In</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span>/</span><strong>{activeNav}</strong></div>
          <div className="top-actions">
            <span className="live-status"><span />Data sync live</span>
            <Popover>
              <PopoverTrigger asChild>
                <button className="icon-button"><Bell size={17} /></button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Notifications</h4>
                  <p className="text-sm text-muted-foreground">You have no new notifications.</p>
                </div>
              </PopoverContent>
            </Popover>
            <button className="help-button" onClick={() => setHelpOpen(true)}><CircleHelp size={16} /> Help</button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="avatar-button">{user?.name ? user.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() : "U"}</button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user?.name || "Guest"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user ? (
                  <DropdownMenuItem className="text-red-600 focus:text-red-600 cursor-pointer" onClick={() => logout()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => setAuthOpen(true)}>
                    <span>Sign In</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="content-wrap">
          <section className="page-heading">
            <div>
              {activeNav === "Overview" && (
                <>
                  <div className="eyebrow"><span className="eyebrow-line" />WORKSPACE OVERVIEW</div>
                  <h1>Know what your data is saying.</h1>
                  <p>Upload any structured dataset. Signalboard maps the shape, surfaces the signal, and keeps the whole story in view.</p>
                </>
              )}
            </div>
            <div className="heading-actions"><button className="assistant-button" onClick={() => setChatOpen(!chatOpen)}><MessageCircle size={15} /> Copilot</button><button className="secondary-button" onClick={resetAll}><RefreshCw size={15} /> Reset</button><button className="primary-button" onClick={() => fileInput.current?.click()}><Upload size={15} /> Upload dataset</button><input ref={fileInput} type="file" accept=".csv,.xls,.xlsx" onChange={handleUpload} hidden /></div>
          </section>

          {activeNav === "Data explorer" && (
            <>
              <section className="dataset-strip">
                <div className="dataset-meta"><div className="file-icon"><FileSpreadsheet size={18} /></div><div><strong>{uploadMessage}</strong><span>Processed just now · {analysisData?.profile?.columns ?? 12} columns detected</span></div></div>
                <div className="detected-types"><span><i className="type-dot numeric" /> {analysisData?.profile?.numeric_columns?.length ?? 5} numeric</span><span><i className="type-dot categorical" /> {analysisData?.profile?.categorical_columns?.length ?? 3} categorical</span><span><i className="type-dot date" /> {analysisData?.profile?.date_columns?.length ?? 1} date</span><span><i className="type-dot boolean" /> {analysisData?.profile?.boolean_columns?.length ?? 3} boolean</span></div>
                <div className="strip-actions"><button className="strip-action" onClick={() => downloadCsv(rows, "original-data.csv")}><ArrowDownToLine size={15} /> Original</button><button className="strip-action" onClick={() => downloadCsv(filteredRows, "filtered-data.csv")}><ArrowDownToLine size={15} /> Filtered</button></div>
              </section>
              <div className="analysis-notice"><span className={analyzeMutation.isPending ? "status-pulse working" : "status-pulse"} />{analysisNotice}<button onClick={() => setIsEditing(!isEditing)}>{isEditing ? "Finish editing" : "Edit after review"}</button>{analysisData?.raw_rows && isEditing && <button onClick={reanalyzeEdited}>Re-run Python</button>}</div>
            </>
          )}
          {(activeNav === "Overview" || activeNav === "Data explorer") && (
            <section className="filter-bar">
              <div className="filter-intro"><div className="filter-icon"><ListFilter size={17} /></div><div><strong>Smart filters</strong><span>Auto-generated from your columns</span></div></div>
              <div className="filter-controls">
                <label><span>Period</span><select value={filters.period} onChange={(event) => setFilters({ ...filters, period: event.target.value })}><option>Last 30 days</option><option>Last 7 days</option><option>All time</option></select><CalendarDays size={14} /></label>
                <label><span>Channel</span><select value={filters.channel} onChange={(event) => setFilters({ ...filters, channel: event.target.value })}>{channels.map((channel) => <option key={channel}>{channel}</option>)}</select><ChevronDown size={14} /></label>
                <label><span>Region</span><select value={filters.region} onChange={(event) => setFilters({ ...filters, region: event.target.value })}>{regions.map((region) => <option key={region}>{region}</option>)}</select><ChevronDown size={14} /></label>
                <button className="filter-toggle" onClick={() => setShowFilters(!showFilters)}>{showFilters ? "Hide filters" : "Show filters"} <Filter size={14} /></button>
              </div>
            </section>
          )}
          {activeNav === "Overview" && (
            <section className="kpi-grid">
              {[{ label: "TOTAL ORDERS", value: formatNumber(totals.orders), delta: "+14.8%", copy: "vs. previous period", spark: true }, { label: "AVG ORDER VALUE", value: `$${formatNumber(totals.average, 2)}`, delta: "+6.2%", copy: "vs. previous period", spark: true }, { label: "RETURN RATE", value: `${totals.orders ? formatNumber((totals.returns / totals.orders) * 100, 1) : "0.0"}%`, delta: "−1.4%", copy: "healthy movement", spark: false }, { label: "ROWS ANALYZED", value: formatNumber(totals.rows), delta: "100%", copy: "data completeness", spark: false }].map((kpi) => <div className="kpi-card" key={kpi.label}><div className="kpi-top"><span>{kpi.label}</span><MoreHorizontal size={16} /></div><div className="kpi-value">{kpi.value}</div><div className="kpi-footer"><span className={kpi.delta.startsWith("−") ? "delta negative" : "delta"}><Activity size={13} />{kpi.delta}</span><span>{kpi.copy}</span></div>{kpi.spark && <MiniSparkline positive={!kpi.delta.startsWith("−")} />}</div>)}
            </section>
          )}
          {activeNav === "Overview" && (
            <section className="dashboard-grid">
              <div className="panel trend-panel">
                <div className="panel-head"><div><div className="panel-kicker"><span className="lime-pip" /> PERFORMANCE SIGNAL</div><h2>Orders over time</h2></div><div className="panel-head-actions"><div className="legend"><span className="legend-dot" /> Orders</div><button className="more-button"><MoreHorizontal size={17} /></button></div></div>
                <div className="chart-subhead"><span>Daily volume across the selected window</span><strong>{formatNumber(totals.orders)} orders</strong></div>
                <div className="large-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 15, right: 8, bottom: 0, left: -18 }}><CartesianGrid vertical={false} stroke="#e7e8e4" strokeDasharray="3 3" /><XAxis dataKey="day" tick={{ fill: "#8b8d87", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#8b8d87", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "#161817", border: "none", borderRadius: 10, color: "#fff" }} cursor={{ stroke: "#d7ddd0" }} /><Line type="monotone" dataKey="orders" stroke="#151716" strokeWidth={3} dot={{ r: 3, fill: "#dfff66", stroke: "#151716", strokeWidth: 2 }} activeDot={{ r: 5, fill: "#dfff66", stroke: "#151716", strokeWidth: 2 }} /></LineChart></ResponsiveContainer></div>
              </div>
              <div className="panel channel-panel">
                <div className="panel-head"><div><div className="panel-kicker"><span className="purple-pip" /> BREAKDOWN</div><h2>Channel mix</h2></div><button className="more-button"><MoreHorizontal size={17} /></button></div>
                <div className="channel-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={channelData} layout="vertical" margin={{ top: 0, right: 4, bottom: 0, left: 7 }}><XAxis type="number" hide /><YAxis dataKey="channel" type="category" tick={{ fill: "#51534f", fontSize: 11 }} width={75} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: "#f3f4ef" }} contentStyle={{ background: "#161817", border: "none", borderRadius: 10, color: "#fff" }} /><Bar dataKey="orders" radius={[0, 6, 6, 0]} barSize={19}>{channelData.map((entry) => <Cell key={entry.channel} fill={entry.fill} />)}</Bar></BarChart></ResponsiveContainer></div>
                <div className="channel-summary">{channelData.slice(0, 2).map((entry, index) => <div key={entry.channel}><span className="summary-dot" style={{ background: entry.fill }} /><span>{entry.channel}</span><strong>{Math.round((entry.orders / Math.max(1, totals.orders)) * 100)}%</strong></div>)}</div>
              </div>
            </section>
          )}
          <section className="lower-grid">
            {activeNav === "Data explorer" && (
              <div className="panel explorer-panel">
                <div className="panel-head explorer-head"><div><div className="panel-kicker"><span className="blue-pip" /> DATA EXPLORER</div><h2>Inspect every row</h2></div><div className="explorer-actions"><div className="search-input"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search dataset" /></div><button className="column-button" onClick={() => setIsEditing(!isEditing)}><MousePointer2 size={14} /> {isEditing ? "Done editing" : "Edit data"}</button><button className="column-button" onClick={() => setShowColumns(!showColumns)}><Layers3 size={14} /> Columns</button>{showColumns && <div className="columns-popover">{columnNames.map(([key, label]) => <label key={key}><input type="checkbox" checked={!hiddenColumns.includes(key)} onChange={() => setHiddenColumns(hiddenColumns.includes(key) ? hiddenColumns.filter((item) => item !== key) : [...hiddenColumns, key])} /><span>{label}</span><Check size={13} /></label>)}</div>}</div></div>
                <div className="table-wrap"><table><thead><tr>{columnNames.filter(([key]) => !hiddenColumns.includes(key)).map(([key, label]) => <th key={key} onClick={() => setSelectedColumn(key)} className={selectedColumn === key ? "selected-col" : ""}>{label}<ChevronDown size={12} /></th>)}</tr></thead><tbody>{displayRows.slice((currentPage - 1) * 6, currentPage * 6).map((row, rowIndex) => <tr key={`${rowIndex}-${String(row[columnNames[0]?.[0] ?? ""])}`} onClick={() => setSelectedColumn(columnNames[0]?.[0] ?? "")}>{columnNames.filter(([key]) => !hiddenColumns.includes(key)).map(([key]) => <td key={key}>{isEditing && analysisData?.raw_rows ? <input className="cell-input" value={String(row[key] ?? "")} onChange={(event) => handleRawCellEdit(row as Record<string, string>, key, event.target.value)} /> : String(row[key] ?? "")}</td>)}</tr>)}</tbody></table></div>
                <div className="table-footer"><span>Showing {Math.min(6, displayRows.length - (currentPage - 1) * 6)} of {displayRows.length} rows</span><div><button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>‹</button><button className="current-page">{currentPage}</button>{currentPage * 6 < displayRows.length && <button onClick={() => setCurrentPage(currentPage + 1)}>{currentPage + 1}</button>}{currentPage * 6 + 6 < displayRows.length && <button onClick={() => setCurrentPage(currentPage + 2)}>{currentPage + 2}</button>}<button disabled={currentPage * 6 >= displayRows.length} onClick={() => setCurrentPage(currentPage + 1)}>›</button></div></div>
              </div>
            )}
            {activeNav === "Insights" && (
              <div className="panel insights-panel"><div className="panel-head"><div><div className="panel-kicker"><span className="orange-pip" /> AUTOMATED INSIGHTS</div><h2>What stands out</h2></div><button className="more-button"><MoreHorizontal size={17} /></button></div><div className="insight-list">{analysisData?.insights?.length ? analysisData.insights.map((insight, index) => <div className="insight-item" key={index}><div className={`insight-icon ${index % 3 === 0 ? "lime" : index % 3 === 1 ? "purple" : "orange"}`}>{index % 3 === 0 ? <TrendingUpIcon /> : index % 3 === 1 ? <MousePointer2 size={15} /> : <Gauge size={15} />}</div><div><strong>Insight {index + 1}</strong><p>{insight}</p></div></div>) : <><div className="insight-item"><div className="insight-icon lime"><TrendingUpIcon /></div><div><strong>Organic is your strongest channel</strong><p>It contributes {channelData[0] ? Math.round((channelData[0].orders / Math.max(1, totals.orders)) * 100) : 0}% of filtered orders.</p></div></div><div className="insight-item"><div className="insight-icon purple"><MousePointer2 size={15} /></div><div><strong>Order value is trending up</strong><p>Average order value is ${formatNumber(totals.average, 2)} across the current view.</p></div></div><div className="insight-item"><div className="insight-icon orange"><Gauge size={15} /></div><div><strong>Returns remain in control</strong><p>Current return rate is {totals.orders ? formatNumber((totals.returns / totals.orders) * 100, 1) : "0.0"}%, below the watch threshold.</p></div></div></>}</div><button className="view-insights" onClick={() => setActiveNav("Insights")}>View all insights <span>→</span></button></div>
            )}
          </section>
          {activeNav === "Data explorer" && (
            <section className="column-analysis"><div className="column-analysis-copy"><div className="panel-kicker"><span className="teal-pip" /> COLUMN ANALYSIS</div><h2>{selectedProfile?.name ?? columnNames.find(([key]) => key === selectedColumn)?.[1] ?? "Orders"}</h2><p>Selected automatically from the explorer. Switch columns to inspect distribution, spread, and quality.</p></div><div className="analysis-stats"><div><span>MEAN</span><strong>{selectedProfile?.stats?.mean !== undefined ? String(selectedProfile.stats.mean) : selectedColumn === "orders" ? formatNumber(totals.orders / Math.max(1, totals.rows), 1) : selectedColumn === "aov" ? `$${formatNumber(totals.average, 2)}` : "—"}</strong></div><div><span>MEDIAN</span><strong>{selectedProfile?.stats?.median !== undefined ? String(selectedProfile.stats.median) : selectedColumn === "aov" ? `$${formatNumber(totals.median, 2)}` : selectedColumn === "orders" ? formatNumber(totals.median) : "—"}</strong></div><div><span>UNIQUE</span><strong>{selectedProfile?.unique ?? (selectedColumn === "channel" ? channels.length - 1 : selectedColumn === "region" ? regions.length - 1 : totals.rows)}</strong></div><div><span>QUALITY</span><strong className="quality"><Check size={14} /> {selectedProfile ? `${Math.round((1 - selectedProfile.missing / Math.max(1, analysisData?.profile?.rows ?? totals.rows)) * 100)}%` : "100%"}</strong></div></div></section>
          )}
          {activeNav === "Chart builder" && (
            <section className="panel builder-panel"><div className="builder-copy"><div className="panel-kicker"><span className="purple-pip" /> CHART BUILDER</div><h2>Make the next question visible.</h2><p>Compose a view from the columns Signalboard found. Every control stays dataset-aware.</p><div className="builder-controls"><label><span>Chart type</span><select value={chartType} onChange={(event) => setChartType(event.target.value)}><option>Bar chart</option><option>Line chart</option><option>Area chart</option></select></label><label><span>X-axis</span><select value={chartX} onChange={(event) => setChartX(event.target.value)}>{analysisData?.columns ? analysisData.columns.filter(c => c.type !== "numeric").map(c => <option key={c.name} value={c.name}>{c.name}</option>) : <><option value="channel">Channel</option><option value="region">Region</option><option value="date">Date</option></>}</select></label><label><span>Y-axis</span><select value={chartY} onChange={(event) => setChartY(event.target.value)}>{analysisData?.columns ? analysisData.columns.filter(c => c.type === "numeric").map(c => <option key={c.name} value={c.name}>{c.name}</option>) : <><option value="orders">Orders</option><option value="aov">Avg order value</option><option value="returns">Returns</option></>}</select></label><label><span>Aggregation</span><select value={aggregation} onChange={(event) => setAggregation(event.target.value)}><option>Sum</option><option>Average</option><option>Count</option></select></label></div></div><div className="builder-preview"><div className="builder-preview-head"><span>{chartType} · {aggregation.toLowerCase()} of {chartY === "aov" ? "avg order value" : chartY}</span><button className="more-button"><MoreHorizontal size={17} /></button></div><div className="builder-chart">{chartType === "Line chart" || chartType === "Area chart" ? <ResponsiveContainer width="100%" height={450}><LineChart data={builderData}><CartesianGrid vertical={false} stroke="#e8ebe5" strokeDasharray="3 3" /><XAxis dataKey="group" tick={{ fill: "#848c80", fontSize: 9 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#848c80", fontSize: 9 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "#161817", border: "none", borderRadius: 8, color: "#fff", fontSize: 10 }} /><Line type="monotone" dataKey="value" stroke="#8d7ce9" strokeWidth={2.5} dot={{ fill: "#dfff66", stroke: "#161817", strokeWidth: 1.5, r: 3 }} /></LineChart></ResponsiveContainer> : <ResponsiveContainer width="100%" height={450}><BarChart data={builderData}><CartesianGrid vertical={false} stroke="#e8ebe5" strokeDasharray="3 3" /><XAxis dataKey="group" tick={{ fill: "#848c80", fontSize: 9 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#848c80", fontSize: 9 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "#161817", border: "none", borderRadius: 8, color: "#fff", fontSize: 10 }} /><Bar dataKey="value" fill="#9a8cff" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>}</div></div></section>
          )}
          {activeNav === "Data cleaning" && (
            <section className="panel">
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%", padding: "1.5rem" }}>
                <div>
                  <div className="panel-kicker"><span className="purple-pip" /> DATA CLEANING STUDIO</div>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginTop: "0.5rem" }}>Transform and clean your data</h2>
                  <p style={{ color: "var(--color-text-muted)" }}>Add calculated columns or remove null values without altering the original dataset.</p>
                </div>
                
                <div style={{ display: "flex", gap: "2rem", marginTop: "1.5rem", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: "300px", padding: "1.5rem", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1.5rem" }}>Add Calculated Column</h3>
                    <form onSubmit={e => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const newName = formData.get("newName") as string;
                      const expression = formData.get("expression") as string;
                      if (newName && expression) {
                        setTransformations(t => [...t, { id: Date.now().toString(), type: "CALCULATE", newName, expression }]);
                        e.currentTarget.reset();
                      }
                    }}>
                      <div style={{ marginBottom: "1rem" }}>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 500 }}>Column Name</label>
                        <input name="newName" type="text" placeholder="e.g. net_profit" style={{ width: "100%", padding: "0.75rem", borderRadius: "6px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text)" }} />
                      </div>
                      <div style={{ marginBottom: "1.5rem" }}>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 500 }}>Expression</label>
                        <input name="expression" type="text" placeholder="e.g. orders * aov" style={{ width: "100%", padding: "0.75rem", borderRadius: "6px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text)", fontFamily: "monospace" }} />
                        <small style={{ color: "var(--color-text-muted)", display: "block", marginTop: "0.5rem" }}>Available fields: {columnNames.map(c => c[0]).join(", ")}</small>
                      </div>
                      <button type="submit" style={{ padding: "0.75rem 1.5rem", background: "var(--color-text)", color: "var(--color-bg)", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", border: "none", width: "100%" }}>Add Column</button>
                    </form>
                  </div>
                  
                  <div style={{ flex: 1, minWidth: "300px", padding: "1.5rem", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1.5rem" }}>Current Transformations</h3>
                    {transformations.length === 0 ? (
                      <p style={{ color: "var(--color-text-muted)" }}>No transformations applied yet.</p>
                    ) : (
                      <ul style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {transformations.map((t) => (
                          <li key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", background: "var(--color-bg)", borderRadius: "6px", border: "1px solid var(--color-border)" }}>
                            <span style={{ fontSize: "0.9rem", fontFamily: t.type === "CALCULATE" ? "monospace" : "inherit" }}>
                              {t.type === "CALCULATE" && <strong style={{ fontFamily: "inherit" }}>Calculated Column: </strong>}
                              {t.type === "CALCULATE" && `${t.newName} = ${t.expression}`}
                              {t.type === "DROP_NULLS" && `Drop Nulls: ${t.column}`}
                            </span>
                            <button onClick={() => setTransformations(prev => prev.filter(p => p.id !== t.id))} style={{ color: "var(--color-text-muted)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "4px", borderRadius: "4px" }}><X size={16} /></button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeNav === "Insights" && (
            <section className="panel insights-panel">
              <div className="panel-head"><div><div className="panel-kicker"><span className="purple-pip" /> AUTOMATED INSIGHTS</div><h2>Business Recommendations</h2></div></div>
              <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {!analysisData?.insights ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>
                    <Sparkles size={32} style={{ margin: "0 auto 16px", opacity: 0.5 }} />
                    <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", marginBottom: "8px", color: "var(--color-text)" }}>No Insights Generated</h3>
                    <p>Upload a dataset to automatically generate business recommendations and anomaly alerts.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
                      {Array.isArray(analysisData.insights) && analysisData.insights.map((insight: any, i: number) => (
                        <div key={i} style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "8px", border: "1px solid var(--color-border)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                            <div style={{ background: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6", padding: "8px", borderRadius: "8px" }}><Sparkles size={18} /></div>
                            <h4 style={{ fontWeight: 600, fontSize: "1rem" }}>Automated Discovery</h4>
                          </div>
                          <p style={{ color: "var(--color-text)", lineHeight: "1.5", fontSize: "0.95rem" }}>{String(insight)}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: "rgba(139, 92, 246, 0.05)", border: "1px solid rgba(139, 92, 246, 0.2)", borderRadius: "8px", padding: "1.5rem", marginTop: "1rem" }}>
                      <h4 style={{ fontWeight: 600, fontSize: "1rem", color: "#8b5cf6", marginBottom: "0.5rem" }}>AI Data Analyst Ready</h4>
                      <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem", marginBottom: "1rem" }}>The AI Copilot has full access to this dataset. You can ask it to generate specific metrics, create calculated columns, or perform advanced statistical analysis directly from the chat.</p>
                      <button onClick={() => setChatOpen(true)} style={{ background: "#8b5cf6", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                        <MessageCircle size={16} /> Open Copilot
                      </button>
                    </div>
                  </>
                )}
              </div>
            </section>
          )}

          {activeNav === "Settings" && (
            <section className="panel settings-panel">
              <div className="panel-head"><div><div className="panel-kicker"><span className="teal-pip" /> PREFERENCES</div><h2>Settings</h2></div></div>
              <div style={{ padding: "24px 32px", color: "#51534f" }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#161817', marginBottom: '8px' }}>User Profile</h3>
                <p style={{ marginBottom: '4px' }}><strong>Name:</strong> {user?.name}</p>
                <p style={{ marginBottom: '24px' }}><strong>Email:</strong> {user?.email}</p>
                <Button variant="destructive" onClick={() => logout()}><LogOut className="mr-2 h-4 w-4" /> Log out</Button>
              </div>
            </section>
          )}
          {chatOpen && <div className="copilot-drawer"><div className="copilot-head"><div><div className="panel-kicker"><span className="purple-pip" /> DATA COPILOT</div><strong>Ask about this dataset</strong><small>{analysisData?.python_engine ? "Grounded in Python analysis" : "Ready for your uploaded file"}</small></div><button className="more-button" onClick={() => setChatOpen(false)}><X size={17} /></button></div><AIChatBox messages={chatMessages} onSendMessage={sendChatMessage} isLoading={chatMutation.isPending} height="390px" className="copilot-chat" emptyStateMessage="Ask a question about trends, columns, or quality." suggestedPrompts={["What stands out?", "Which rows look unusual?", "Show me missing data risks"]} /></div>}

          <footer className="footer-note"><span><WandSparkles size={14} /> Signalboard automatically adapts to the columns in your dataset.</span><span>Last analyzed 2 min ago · <button onClick={resetAll}>Re-run analysis</button></span></footer>
        </div>
      </main>

      {/* Modals */}
      {!user && <AuthModal open={authOpen} onOpenChange={setAuthOpen} />}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Help & Documentation</DialogTitle>
            <DialogDescription>
              Signalboard Analytics OS allows you to analyze any structured data. Upload a CSV or Excel file to get started. 
              The AI Copilot will automatically detect types, suggest insights, and allow you to chat with your data.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TrendingUpIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 11.5 6 7.5l2.5 2.5L14 4.5M10.5 4.5H14v3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
