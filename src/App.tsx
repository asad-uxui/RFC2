import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Camera, 
  X, 
  MoreHorizontal,
  Trash2,
  Edit2,
  ExternalLink,
  Share2,
  Copy,
  Check,
  Sun,
  Moon,
  LayoutGrid,
  Download,
  List as ListIcon,
  ChevronDown,
  FileText,
  FileCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from './lib/firebase';
import { Issue, IssueStatus, OperationType, FirestoreErrorInfo, Project } from './types';

// Error Handler
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const Logo = ({ size = "md", isDarkMode = false }: { size?: "sm" | "md" | "lg", isDarkMode?: boolean }) => {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16"
  };
  
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
      className={`${sizes[size]} relative flex items-center justify-center`}
    >
      <svg 
        viewBox="0 0 40 40" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        <rect 
          width="40" 
          height="40" 
          rx="12" 
          fill={isDarkMode ? "#FFFFFF" : "#0F172A"} 
        />
        {/* Stylized Q / Search Handle */}
        <path 
          d="M20 28C24.4183 28 28 24.4183 28 20C28 15.5817 24.4183 12 20 12C15.5817 12 12 15.5817 12 20C12 23 13.5 25.5 15.8 27" 
          stroke={isDarkMode ? "#0F172A" : "#FFFFFF"} 
          strokeWidth="3" 
          strokeLinecap="round" 
        />
        {/* Checkmark inside */}
        <path 
          d="M17 21L19.5 23.5L25 18" 
          stroke={isDarkMode ? "#0F172A" : "#FFFFFF"} 
          strokeWidth="3" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        {/* Technical Accent Dots */}
        <circle cx="28" cy="28" r="2.5" fill={isDarkMode ? "#0F172A" : "#FFFFFF"} />
      </svg>
    </motion.div>
  );
};

export default function App() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<IssueStatus | 'all'>('all');
  const [filterProject, setFilterProject] = useState<string | 'all'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [copied, setCopied] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [issueToEdit, setIssueToEdit] = useState<Issue | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  
  // Test connection on boot
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'issues'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Issue[];
      setIssues(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'issues');
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      setProjects(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    });

    return unsubscribe;
  }, []);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const filteredIssues = issues.filter(issue => {
    const matchesSearch = issue.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || issue.status === filterStatus;
    const matchesProject = filterProject === 'all' || issue.projectId === filterProject;
    return matchesSearch && matchesStatus && matchesProject;
  });

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-black-950 text-black-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-30 transition-all border-b ${isDarkMode ? 'bg-black-900/80 border-black-800' : 'bg-white border-slate-200'} backdrop-blur-md`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" isDarkMode={isDarkMode} />
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-xl transition-all border ${isDarkMode ? 'bg-black-800 border-black-700 text-amber-400 hover:bg-black-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Issue Tracker</h1>
            <p className={`${isDarkMode ? 'text-black-400' : 'text-slate-500'}`}>Monitor and resolve reported QA issues.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsAddingProject(true)}
              className={`flex items-center justify-center gap-2 font-semibold py-2.5 px-5 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 ${isDarkMode ? 'bg-black-800 border border-black-700 text-white hover:bg-black-700' : 'bg-white border border-slate-200 text-slate-800 hover:bg-slate-50'}`}
            >
              <Plus size={20} />
              New Project
            </button>
            <button 
              onClick={() => setIsAdding(true)}
              className={`flex items-center justify-center gap-2 font-semibold py-2.5 px-5 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 ${isDarkMode ? 'bg-white hover:bg-black-100 text-black-950' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
            >
              <Plus size={20} />
              New Issue
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className={`p-5 rounded-2xl shadow-sm border mb-8 flex flex-col gap-3 transition-colors ${isDarkMode ? 'bg-black-900 border-black-800' : 'bg-white border-slate-200'}`}>
          <div className="relative w-full">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-black-600' : 'text-slate-400'}`} size={20} />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all text-base ${isDarkMode ? 'bg-black-950 border-black-800 text-white focus:ring-white focus:border-transparent' : 'bg-white border-slate-200 text-slate-800 focus:ring-slate-900'}`}
            />
          </div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pt-2">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className={isDarkMode ? 'text-black-600' : 'text-slate-400'} size={18} />
                <select 
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}
                  className={`border rounded-xl py-2 px-3 focus:outline-none focus:ring-2 text-sm font-medium transition-all ${isDarkMode ? 'bg-black-950 border-black-800 text-black-300 focus:ring-white' : 'bg-slate-50 border-slate-200 text-slate-700 focus:ring-slate-900'}`}
                >
                  <option value="all">All Projects</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className={`border rounded-xl py-2 px-3 focus:outline-none focus:ring-2 text-sm font-medium transition-all ${isDarkMode ? 'bg-black-950 border-black-800 text-black-300 focus:ring-white' : 'bg-slate-50 border-slate-200 text-slate-700 focus:ring-slate-900'}`}
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              <div className={`p-1 rounded-xl border flex items-center transition-colors ${isDarkMode ? 'bg-black-950 border-black-800' : 'bg-slate-100 border-slate-200'}`}>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${viewMode === 'list' ? (isDarkMode ? 'bg-white text-black-950 shadow-sm' : 'bg-white text-slate-900 shadow-sm') : (isDarkMode ? 'text-black-500 hover:text-black-300' : 'text-slate-500 hover:text-slate-700')}`}
                >
                  <ListIcon size={14} />
                  <span className="hidden sm:inline">List View</span>
                </button>
                <button 
                  onClick={() => setViewMode('card')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${viewMode === 'card' ? (isDarkMode ? 'bg-white text-black-950 shadow-sm' : 'bg-white text-slate-900 shadow-sm') : (isDarkMode ? 'text-black-500 hover:text-black-300' : 'text-slate-500 hover:text-slate-700')}`}
                >
                  <LayoutGrid size={14} />
                  <span className="hidden sm:inline">Grid View</span>
                </button>
              </div>

              <div className="relative">
                <button 
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-2 py-2 px-5 rounded-xl border text-xs font-semibold transition-all active:scale-95 shadow-sm ${isDarkMode ? 'bg-black-950 border-black-800 text-black-400 hover:text-black-200' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'}`}
                >
                  <Download size={16} />
                  <span>Download</span>
                  <ChevronDown size={14} className={`transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showExportDropdown && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowExportDropdown(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className={`absolute right-0 bottom-full mb-2 w-48 rounded-xl shadow-2xl border p-1.5 z-50 transition-colors ${isDarkMode ? 'bg-black-800 border-black-700' : 'bg-white border-slate-200'}`}
                      >
                        <button 
                          onClick={() => {
                            setExportFormat('csv');
                            setIsExporting(true);
                            setShowExportDropdown(false);
                          }}
                          className={`flex items-center gap-3 w-full text-left p-3 text-xs font-semibold rounded-lg transition-colors ${isDarkMode ? 'text-black-300 hover:bg-black-700 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                        >
                          <FileText size={16} className="text-emerald-500" />
                          <span>Export as CSV</span>
                        </button>
                        <button 
                          onClick={() => {
                            setExportFormat('pdf');
                            setIsExporting(true);
                            setShowExportDropdown(false);
                          }}
                          className={`flex items-center gap-3 w-full text-left p-3 text-xs font-semibold rounded-lg transition-colors ${isDarkMode ? 'text-black-300 hover:bg-black-700 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                        >
                          <FileCode size={16} className="text-rose-500" />
                          <span>Export as PDF</span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Issue List Source */}
        {viewMode === 'list' && (
          <div className={`rounded-xl shadow-sm border overflow-hidden transition-colors ${isDarkMode ? 'bg-black-900 border-black-800' : 'bg-white border-slate-200'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`${isDarkMode ? 'bg-black-800/50 border-b border-black-800' : 'bg-slate-50 border-b border-slate-200'}`}>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">No.</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Preview</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reporter</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y transition-colors ${isDarkMode ? 'divide-black-800' : 'divide-slate-100'}`}>
                  {filteredIssues.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                        No issues found.
                      </td>
                    </tr>
                  ) : (
                    filteredIssues.map((issue, index) => (
                      <IssueRow 
                        key={issue.id} 
                        issue={issue} 
                        index={index + 1} 
                        projects={projects}
                        onView={() => setSelectedIssue(issue)}
                        isDarkMode={isDarkMode}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {viewMode === 'card' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredIssues.length === 0 ? (
              <div className="col-span-full py-20 text-center text-slate-400 italic">
                No issues found.
              </div>
            ) : (
              filteredIssues.map((issue) => (
                <IssueCard 
                  key={issue.id} 
                  issue={issue} 
                  projects={projects}
                  onView={() => setSelectedIssue(issue)}
                  isDarkMode={isDarkMode}
                />
              ))
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isAdding && (
          <IssueModal 
            onClose={() => {
              setIsAdding(false);
              setIssueToEdit(null);
            }} 
            projects={projects}
            issueToEdit={issueToEdit || undefined}
          />
        )}
        {isAddingProject && (
          <ProjectModal 
            onClose={() => setIsAddingProject(false)} 
          />
        )}
        {isExporting && (
          <ExportModal 
            onClose={() => setIsExporting(false)} 
            issues={issues} 
            projects={projects}
            format={exportFormat}
          />
        )}
        {selectedIssue && (
          <ViewIssueModal 
            issue={selectedIssue} 
            projects={projects}
            onClose={() => setSelectedIssue(null)} 
            onEdit={(issue) => {
              setSelectedIssue(null);
              setIssueToEdit(issue);
              setIsAdding(true);
            }}
          />
        )}
      </AnimatePresence>

      <footer className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pb-8 border-t transition-colors ${isDarkMode ? 'border-black-800' : 'border-slate-200'}`}>
        <div className="pt-8 flex items-center justify-center">
          <div className={`text-xs font-normal transition-colors ${isDarkMode ? 'text-black-400' : 'text-slate-500'}`}>
            Created by ASAD
          </div>
        </div>
      </footer>
    </div>
  );
}

function IssueRow({ issue, index, onView, isDarkMode, projects }: { issue: Issue, index: number, onView: () => void, isDarkMode: boolean, projects: Project[], key?: string }) {
  const isDeleting = false; // Simplified
  const project = projects.find(p => p.id === issue.projectId);

  const StatusBadge = ({ status }: { status: IssueStatus }) => {
    const configs = {
      open: { 
        color: isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-600 border-amber-200', 
        icon: AlertCircle, 
        label: 'Open' 
      },
      'in-progress': { 
        color: isDarkMode ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-slate-50 text-slate-600 border-slate-200', 
        icon: Clock, 
        label: 'In Progress' 
      },
      resolved: { 
        color: isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200', 
        icon: CheckCircle2, 
        label: 'Resolved' 
      }
    };
    const config = configs[status];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold transition-colors ${config.color}`}>
        <Icon size={12} />
        {config.label}
      </span>
    );
  };

  return (
    <motion.tr 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onView}
      className={`transition-colors cursor-pointer group ${isDeleting ? 'opacity-50 grayscale' : ''} ${isDarkMode ? 'hover:bg-black-800/50' : 'hover:bg-slate-50/80'}`}
    >
      <td className="px-6 py-4 text-sm font-medium text-slate-500">{index}.</td>
      <td className="px-6 py-4">
        {issue.screenshotUrl ? (
          <div className={`w-12 h-12 rounded-lg border overflow-hidden flex items-center justify-center transition-colors ${isDarkMode ? 'bg-black-800 border-black-700' : 'bg-slate-100 border-slate-200'}`}>
             <img src={issue.screenshotUrl} alt="Issue thumbnail" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className={`w-12 h-12 rounded-lg border overflow-hidden flex items-center justify-center transition-colors ${isDarkMode ? 'bg-black-800 border-black-700 text-black-600' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
             <Camera size={16} />
          </div>
        )}
      </td>
      <td className="px-6 py-4 max-w-xs">
        <div className={`text-sm font-medium line-clamp-1 transition-colors break-words ${isDarkMode ? 'text-black-200' : 'text-slate-800'}`}>{issue.description}</div>
        {project && (
           <span className={`text-[9px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-black-500' : 'text-slate-400'}`}>
             {project.name}
           </span>
        )}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold overflow-hidden transition-colors ${isDarkMode ? 'bg-black-800 text-black-400' : 'bg-slate-100 text-slate-500'}`}>
             {issue.reporterName?.charAt(0) || <MoreHorizontal size={10} />}
          </div>
          <span className={`text-xs font-medium whitespace-nowrap transition-colors ${isDarkMode ? 'text-black-400' : 'text-slate-600'}`}>{issue.reporterName || 'Unknown'}</span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <StatusBadge status={issue.status} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
        {issue.createdAt?.toDate?.().toLocaleDateString() || 'Pending...'}
      </td>
      <td className="px-6 py-4 text-right">
         <button className={`text-xs font-semibold px-3 py-1 rounded-xl transition-colors ${isDarkMode ? 'text-white bg-black-800 hover:bg-black-700 border border-black-700' : 'text-blue-600 bg-blue-50 hover:bg-blue-100'}`}>
            Details
         </button>
      </td>
    </motion.tr>
  );
}

function IssueCard({ issue, onView, isDarkMode, projects }: { issue: Issue, onView: () => void, isDarkMode: boolean, projects: Project[], key?: string }) {
  const project = projects.find(p => p.id === issue.projectId);
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      onClick={onView}
      className={`rounded-2xl border shadow-sm hover:shadow-xl transition-all cursor-pointer overflow-hidden flex flex-col group ${isDarkMode ? 'bg-black-900 border-black-800' : 'bg-white border-slate-200'}`}
    >
      {/* Card Header (Image or Placeholder) */}
      <div className={`relative h-40 w-full overflow-hidden transition-colors ${isDarkMode ? 'bg-black-950' : 'bg-slate-100'}`}>
        {issue.screenshotUrl ? (
          <img 
            src={issue.screenshotUrl} 
            alt="Issue preview" 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400">
            <Camera size={24} strokeWidth={1.5} />
            <span className="text-[10px] font-semibold uppercase tracking-widest">No Screenshot</span>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <StatusBadge status={issue.status} />
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              Issue #{issue.id.slice(-6).toUpperCase()}
            </span>
            {project && (
              <span className={`text-[9px] font-semibold uppercase tracking-tight ${isDarkMode ? 'text-black-500' : 'text-emerald-600'}`}>
                {project.name}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium text-slate-500">
            {issue.createdAt?.toDate?.().toLocaleDateString() || 'Pending'}
          </span>
        </div>

        <p className={`text-sm font-semibold mb-4 line-clamp-2 leading-relaxed flex-1 transition-colors break-words ${isDarkMode ? 'text-black-200' : 'text-slate-800'}`}>
          {issue.description}
        </p>

        <div className={`pt-4 border-t flex items-center justify-between transition-colors ${isDarkMode ? 'border-black-800' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold overflow-hidden transition-colors ${isDarkMode ? 'bg-black-800 text-black-400' : 'bg-slate-100 text-slate-500'}`}>
               {issue.reporterName?.charAt(0) || <MoreHorizontal size={10} />}
            </div>
            <span className={`text-xs font-medium transition-colors ${isDarkMode ? 'text-black-400' : 'text-slate-600'}`}>
              {issue.reporterName || 'Unknown'}
            </span>
          </div>
          <div className={`p-1.5 rounded-xl transition-colors ${isDarkMode ? 'bg-black-800 text-white group-hover:bg-white group-hover:text-black-950' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-900 group-hover:text-white'}`}>
            <ExternalLink size={14} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ViewIssueModal({ issue, onClose, projects, onEdit }: { issue: Issue, onClose: () => void, projects: Project[], onEdit: (issue: Issue) => void }) {
  const isDarkMode = document.documentElement.classList.contains('dark');
  const [isZoomed, setIsZoomed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const project = projects.find(p => p.id === issue.projectId);

  const updateStatus = async (newStatus: IssueStatus) => {
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'issues', issue.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      setShowStatusMenu(false);
      onClose(); // Close modal after update for clarity
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `issues/${issue.id}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteIssue = async () => {
    setIsUpdating(true);
    try {
      const issueRef = doc(db, 'issues', issue.id);
      await deleteDoc(issueRef);
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `issues/${issue.id}`);
    } finally {
      setIsUpdating(false);
      setShowDeleteConfirm(false);
    }
  };

  const canEdit = true; // Everyone can edit since auth is removed

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black-900/60 backdrop-blur-md"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`w-full max-w-2xl overflow-hidden relative z-10 border max-h-[90vh] flex flex-col rounded-2xl shadow-2xl transition-colors ${isDarkMode ? 'bg-black-900 border-black-800' : 'bg-white border-slate-200'}`}
      >
        <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 transition-colors ${isDarkMode ? 'bg-black-900 border-black-800' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-3">
             <StatusBadge status={issue.status} />
             <span className="text-xs text-slate-400 font-medium">Issue #{issue.id.slice(-6).toUpperCase()}</span>
             {project && (
               <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${isDarkMode ? 'bg-black-800 border-black-700 text-black-400' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                 Project: {project.name}
               </span>
             )}
          </div>
          <button onClick={onClose} className={`p-1 rounded-full transition-colors ${isDarkMode ? 'hover:bg-black-800' : 'hover:bg-slate-100'}`}>
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="mb-8">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Description</h3>
              {canEdit && (
                <div className="flex items-center gap-1">
                  <button 
                    type="button"
                    onClick={() => onEdit(issue)}
                    disabled={isUpdating}
                    className={`p-1.5 rounded-xl transition-all disabled:opacity-50 ${isDarkMode ? 'text-black-400 hover:bg-black-800 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                    title="Edit Issue"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isUpdating}
                    className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all disabled:opacity-50"
                    title="Delete Issue"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
            <p className={`text-lg leading-relaxed whitespace-pre-wrap font-medium transition-colors break-words ${isDarkMode ? 'text-black-200' : 'text-slate-800'}`}>{issue.description}</p>
          </div>

          {issue.screenshotUrl && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">Screenshot</h3>
              <div 
                onClick={() => setIsZoomed(true)}
                className={`rounded-xl overflow-hidden border group relative cursor-zoom-in transition-colors ${isDarkMode ? 'bg-black-950 border-black-800' : 'bg-slate-50 border-slate-200'}`}
              >
                <img src={issue.screenshotUrl} alt="Issue Full" className="w-full max-h-[400px] object-contain mx-auto" />
                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-white/5 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className={`px-4 py-2 rounded-xl text-sm font-semibold shadow-lg ${isDarkMode ? 'bg-black-800 text-white' : 'bg-white text-slate-900'}`}>Click to Enlarge</span>
                </div>
              </div>
            </div>
          )}

          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-xl border transition-colors ${isDarkMode ? 'bg-black-950/50 border-black-800' : 'bg-slate-50 border-slate-100'}`}>
            <div>
              <h4 className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Reporter</h4>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold overflow-hidden transition-colors ${isDarkMode ? 'bg-black-800 text-black-400' : 'bg-slate-200 text-slate-500'}`}>
                   {issue.reporterName?.charAt(0) || <MoreHorizontal size={14} />}
                </div>
                <div>
                  <div className={`text-sm font-semibold transition-colors ${isDarkMode ? 'text-black-300' : 'text-slate-800'}`}>{issue.reporterName || 'Anonymous'}</div>
                  <div className="text-xs text-slate-500">{issue.reporterEmail || 'No Email'}</div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Timeline</h4>
              <div className={`text-sm transition-colors ${isDarkMode ? 'text-black-400' : 'text-slate-600'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  Created: {issue.createdAt?.toDate?.().toLocaleString() || 'Just now'}
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  Last Updated: {issue.updatedAt?.toDate?.().toLocaleString() || 'Pending...'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`px-6 py-4 border-t flex items-center justify-between shrink-0 transition-colors ${isDarkMode ? 'bg-black-900/50 border-black-800' : 'bg-slate-50 border-slate-100'}`}>
          <div className="relative">
            <>
              <button 
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className={`flex items-center gap-2 border px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-95 ${isDarkMode ? 'bg-black-800 border-black-700 text-black-200 hover:bg-black-700' : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300'}`}
              >
                Change Status <Filter size={14} />
              </button>
              <AnimatePresence>
                {showStatusMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className={`absolute bottom-full left-0 mb-2 w-48 rounded-xl shadow-2xl border p-1 flex flex-col gap-1 z-50 transition-colors ${isDarkMode ? 'bg-black-800 border-black-700' : 'bg-white border-slate-200'}`}
                  >
                    <button onClick={() => updateStatus('open')} className="flex items-center gap-2 w-full text-left p-2.5 text-sm font-semibold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl">
                      <AlertCircle size={16} /> Mark Open
                    </button>
                    <button onClick={() => updateStatus('in-progress')} className="flex items-center gap-2 w-full text-left p-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl">
                      <Clock size={16} /> In Progress
                    </button>
                    <button onClick={() => updateStatus('resolved')} className="flex items-center gap-2 w-full text-left p-2.5 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl">
                      <CheckCircle2 size={16} /> Mark Resolved
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          </div>
          <button 
            onClick={onClose}
            className={`px-6 py-2 font-semibold rounded-xl transition-all shadow-md active:scale-95 ${isDarkMode ? 'bg-white hover:bg-black-100 text-black-950' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
          >
            Close
          </button>
        </div>
      </motion.div>

      {/* Zoom Modal */}
      <AnimatePresence>
        {isZoomed && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsZoomed(false)}
            className="fixed inset-0 z-[60] bg-black-900 flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.img 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              src={issue.screenshotUrl} 
              alt="Zoomed View" 
              className="max-w-full max-h-full object-contain"
            />
            <button className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
              <X size={24} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`w-full max-w-sm p-6 rounded-2xl shadow-2xl relative z-10 border transition-colors ${isDarkMode ? 'bg-black-900 border-black-800' : 'bg-white border-slate-200'}`}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mb-4">
                  <Trash2 size={24} />
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Delete Issue?</h3>
                <p className={`text-sm mb-6 ${isDarkMode ? 'text-black-400' : 'text-slate-500'}`}>
                  Are you sure you want to delete this issue? This action cannot be undone.
                </p>
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setShowDeleteConfirm(false)}
                    className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all active:scale-95 ${isDarkMode ? 'bg-black-800 text-black-300 hover:bg-black-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={deleteIssue}
                    className="flex-1 py-3 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold transition-all active:scale-95 shadow-lg shadow-rose-500/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusBadge({ status }: { status: IssueStatus }) {
  const isDarkMode = document.documentElement.classList.contains('dark');
  const configs = {
    open: { 
      color: isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-600 border-amber-200', 
      icon: AlertCircle, 
      label: 'Open' 
    },
    'in-progress': { 
      color: isDarkMode ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-slate-50 text-slate-600 border-slate-200', 
      icon: Clock, 
      label: 'In Progress' 
    },
    resolved: { 
      color: isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200', 
      icon: CheckCircle2, 
      label: 'Resolved' 
    }
  };
  const config = configs[status];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold transition-colors ${config.color}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}


function ExportModal({ onClose, issues, projects, format }: { onClose: () => void, issues: Issue[], projects: Project[], format: 'csv' | 'pdf' }) {
  const isDarkMode = document.documentElement.classList.contains('dark');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [isProcessing, setIsProcessing] = useState(false);

  const getImageData = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const handleExport = async () => {
    setIsProcessing(true);
    try {
      let issuesToExport = issues;
      
      if (selectedProjectId !== 'all') {
        issuesToExport = issues.filter(i => i.projectId === selectedProjectId);
      }

      // Sort by creation time (ascending) - tasks added first appear first
      issuesToExport = [...issuesToExport].sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeA - timeB;
      });

      if (format === 'csv') {
        let filename = 'all_issues.csv';
        if (selectedProjectId !== 'all') {
          const project = projects.find(p => p.id === selectedProjectId);
          filename = `${project?.name.toLowerCase().replace(/\s+/g, '_') || 'project'}_issues.csv`;
        }

        const headers = ['ID', 'Description', 'Status', 'Project', 'Reporter', 'Created At', 'Screenshot'];
        const csvRows = [
          headers.join(','),
          ...issuesToExport.map(issue => {
            const project = projects.find(p => p.id === issue.projectId);
            return [
              `"${issue.id}"`,
              `"${issue.description.replace(/"/g, '""')}"`,
              `"${issue.status}"`,
              `"${project?.name || 'No Project'}"`,
              `"${issue.reporterName || 'Anonymous'}"`,
              `"${issue.createdAt?.toDate?.().toLocaleString() || 'Pending'}"`,
              `"${issue.screenshotUrl || ''}"`
            ].join(',');
          })
        ];

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', filename);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        // PDF Export
        const doc = new jsPDF() as any;
        const title = selectedProjectId === 'all' 
          ? 'Issue Reports Summary' 
          : `${projects.find(p => p.id === selectedProjectId)?.name || 'Project'} - Detailed Issue Report`;
        
        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(title, 14, 25);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);
        doc.text(`Total Issues: ${issuesToExport.length}`, 14, 37);

        let currentY = 45;
        const margin = 14;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const contentWidth = pageWidth - (margin * 2);

        for (let i = 0; i < issuesToExport.length; i++) {
          const issue = issuesToExport[i];
          const project = projects.find(p => p.id === issue.projectId);

          // Check if we need a new page for the next issue
          if (currentY > pageHeight - 60) {
            doc.addPage();
            currentY = 20;
          }

          // Issue Header
          doc.setFillColor(248, 250, 252); // slate-50
          doc.rect(margin, currentY, contentWidth, 8, 'F');
          
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.text(`ISSUE #${issue.id.substring(0, 8).toUpperCase()}`, margin + 2, currentY + 6);
          currentY += 15;

          // Details Grid (2 columns simulation)
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(100);
          
          const col1 = margin;
          const col2 = margin + (contentWidth / 2);

          doc.text('Project:', col1, currentY);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0);
          doc.text(project?.name || 'N/A', col1 + 25, currentY);

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100);
          doc.text('Status:', col2, currentY);
          doc.setFont('helvetica', 'bold');
          const statusColor = issue.status === 'resolved' ? [16, 185, 129] : (issue.status === 'in-progress' ? [59, 130, 246] : [245, 158, 11]);
          doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
          doc.text(issue.status.toUpperCase(), col2 + 25, currentY);

          currentY += 7;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100);
          doc.text('Reporter:', col1, currentY);
          doc.setTextColor(0);
          doc.text(issue.reporterName || 'Anonymous', col1 + 25, currentY);

          doc.setTextColor(100);
          doc.text('Date:', col2, currentY);
          doc.setTextColor(0);
          doc.text(issue.createdAt?.toDate?.().toLocaleDateString() || 'Pending', col2 + 25, currentY);

          currentY += 10;
          
          // Description
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100);
          doc.text('Description:', col1, currentY);
          currentY += 5;
          doc.setTextColor(51, 65, 85);
          
          const splitDescription = doc.splitTextToSize(issue.description, contentWidth);
          doc.text(splitDescription, margin, currentY);
          currentY += (splitDescription.length * 5) + 5;

          // Image handling
          if (issue.screenshotUrl) {
            try {
              const imageData = await getImageData(issue.screenshotUrl);
              
              // Temporary image to get dimensions
              const tempImg = new Image();
              tempImg.src = imageData;
              await new Promise((resolve) => tempImg.onload = resolve);

              const imgRatio = tempImg.width / tempImg.height;
              
              // Medium size target: Max 120mm width or 80mm height
              let targetWidth = 120;
              let targetHeight = targetWidth / imgRatio;

              if (targetHeight > 80) {
                targetHeight = 80;
                targetWidth = targetHeight * imgRatio;
              }

              // Center image
              const xPos = margin + (contentWidth - targetWidth) / 2;

              // Check page space for image
              if (currentY + targetHeight > pageHeight - 20) {
                doc.addPage();
                currentY = 20;
              }

              doc.addImage(imageData, 'JPEG', xPos, currentY, targetWidth, targetHeight);
              currentY += targetHeight + 15;
            } catch (err) {
              console.error(`Failed to load image for ${issue.id}:`, err);
              doc.setTextColor(239, 68, 68);
              doc.text('[Failed to load screenshot]', margin, currentY);
              currentY += 10;
            }
          } else {
            currentY += 5;
          }

          // Separator line
          doc.setDrawColor(226, 232, 240); // slate-200
          doc.line(margin, currentY, margin + contentWidth, currentY);
          currentY += 15;
        }

        const filename = selectedProjectId === 'all' 
          ? 'issues_report.pdf' 
          : `${projects.find(p => p.id === selectedProjectId)?.name.toLowerCase().replace(/\s+/g, '_') || 'project'}_report.pdf`;
        
        doc.save(filename);
      }
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black-900/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`w-full max-w-sm overflow-hidden relative z-50 border rounded-2xl shadow-2xl transition-colors ${isDarkMode ? 'bg-black-900 border-black-800' : 'bg-white border-slate-200'}`}
      >
        <div className={`px-6 py-4 border-b flex items-center justify-between transition-colors ${isDarkMode ? 'bg-black-900/50 border-black-800' : 'bg-slate-50/50 border-slate-100'}`}>
          <h2 className={`text-xl font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Export to {format.toUpperCase()}</h2>
          <button onClick={onClose} className={`p-1 rounded-full transition-colors ${isDarkMode ? 'hover:bg-black-800' : 'hover:bg-slate-100'}`}>
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6">
          <div className={`p-4 rounded-xl border mb-6 flex items-start gap-3 transition-colors ${isDarkMode ? 'bg-black-950 border-black-800' : 'bg-slate-50 border-slate-100'}`}>
            <div className={`p-2 rounded-lg ${format === 'csv' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
              {format === 'csv' ? <FileText size={24} /> : <FileCode size={24} />}
            </div>
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-black-500' : 'text-slate-400'}`}>File Format</p>
              <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{format === 'csv' ? 'Comma Separated Values' : 'Portable Document Format'}</p>
            </div>
          </div>

          <div className="mb-6">
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-black-500' : 'text-slate-400'}`}>Filter by Project</label>
            <select 
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className={`w-full p-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${isDarkMode ? 'bg-black-950 border-black-800 text-white focus:ring-white focus:border-transparent' : 'bg-white border-slate-200 text-slate-700 focus:ring-slate-900'}`}
            >
              <option value="all">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <p className={`text-xs mb-8 transition-colors ${isDarkMode ? 'text-black-400' : 'text-slate-500'}`}>
            {selectedProjectId === 'all' 
              ? `This will include all ${issues.length} reported issues across all projects.` 
              : `This will include only the issues associated with the selected project.`}
          </p>

          <div className="flex flex-col gap-3">
            <button 
              onClick={handleExport}
              disabled={isProcessing}
              className={`w-full py-3 px-4 font-semibold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${isDarkMode ? 'bg-white text-black-950 hover:bg-black-100' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
            >
              {isProcessing ? (
                <>
                  <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${isDarkMode ? 'border-black-900' : 'border-white'}`} />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Download size={18} />
                  <span>Proceed with Export</span>
                </>
              )}
            </button>
            <button 
              onClick={onClose}
              disabled={isProcessing}
              className={`w-full py-3 px-4 font-semibold rounded-xl border transition-all active:scale-95 disabled:opacity-50 ${isDarkMode ? 'bg-black-800 border-black-700 text-black-300 hover:bg-black-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ProjectModal({ onClose }: { onClose: () => void }) {
  const isDarkMode = document.documentElement.classList.contains('dark');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const projectData = {
        name,
        description,
        createdBy: 'anonymous_user',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'projects'), projectData);
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'projects');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black-900/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`w-full max-w-md overflow-hidden relative z-10 border my-8 rounded-2xl shadow-2xl transition-colors ${isDarkMode ? 'bg-black-900 border-black-800' : 'bg-white border-slate-200'}`}
      >
        <div className={`px-6 py-4 border-b flex items-center justify-between transition-colors ${isDarkMode ? 'bg-black-900/50 border-black-800' : 'bg-slate-50/50 border-slate-100'}`}>
          <h2 className={`text-xl font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>New Project</h2>
          <button onClick={onClose} className={`p-1 rounded-full transition-colors ${isDarkMode ? 'hover:bg-black-800' : 'hover:bg-slate-100'}`}>
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className={`block text-sm font-semibold mb-2 transition-colors ${isDarkMode ? 'text-black-300' : 'text-slate-700'}`}>Project Name</label>
            <input 
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., E-commerce Redesign"
              className={`w-full p-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${isDarkMode ? 'bg-black-950 border-black-800 text-white focus:ring-white focus:border-transparent' : 'bg-white border-slate-200 text-slate-700 focus:ring-slate-900'}`}
              required
            />
          </div>

          <div className="mb-6">
            <label className={`block text-sm font-semibold mb-2 transition-colors ${isDarkMode ? 'text-black-300' : 'text-slate-700'}`}>Description (Optional)</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              className={`w-full h-24 p-3 border rounded-xl focus:outline-none focus:ring-2 transition-all resize-none ${isDarkMode ? 'bg-black-950 border-black-800 text-white focus:ring-white focus:border-transparent' : 'bg-white border-slate-200 text-slate-700 focus:ring-slate-900'}`}
            />
          </div>

          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={onClose}
              className={`flex-1 py-3 px-4 border font-semibold rounded-xl transition-all active:scale-[0.98] ${isDarkMode ? 'bg-black-800 border-black-700 text-black-300 hover:bg-black-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className={`flex-1 py-3 px-4 font-semibold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'bg-white hover:bg-black-100 text-black-950' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function IssueModal({ onClose, projects, issueToEdit }: { onClose: () => void, projects: Project[], issueToEdit?: Issue }) {
  const isDarkMode = document.documentElement.classList.contains('dark');
  const [description, setDescription] = useState(issueToEdit?.description || '');
  const [projectId, setProjectId] = useState(issueToEdit?.projectId || '');
  const [screenshot, setScreenshot] = useState<string | null>(issueToEdit?.screenshotUrl || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress as JPEG with 0.7 quality to stay well under 1MB
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsSubmitting(true);
      try {
        const compressed = await compressImage(file);
        // Base64 encoding adds ~33% overhead. 
        // 1MB limit for document means base64 should be < ~800KB.
        if (compressed.length > 900000) {
          alert("Image is still too large even after compression. Please use a smaller file.");
          return;
        }
        setScreenshot(compressed);
      } catch (error) {
        console.error("Compression failed:", error);
        alert("Failed to process image.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    try {
      const issueData = {
        description,
        screenshotUrl: screenshot,
        projectId: projectId || null,
        updatedAt: serverTimestamp()
      };

      if (issueToEdit) {
        await updateDoc(doc(db, 'issues', issueToEdit.id), issueData);
      } else {
        await addDoc(collection(db, 'issues'), {
          ...issueData,
          status: 'open',
          reporterId: 'anonymous_user',
          reporterName: 'Guest User',
          reporterEmail: 'guest@anonymous.com',
          createdAt: serverTimestamp(),
        });
      }
      onClose();
    } catch (error) {
      handleFirestoreError(error, issueToEdit ? OperationType.UPDATE : OperationType.CREATE, issueToEdit ? `issues/${issueToEdit.id}` : 'issues');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black-900/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`w-full max-w-lg overflow-hidden relative z-10 border my-8 rounded-2xl shadow-2xl transition-colors ${isDarkMode ? 'bg-black-900 border-black-800' : 'bg-white border-slate-200'}`}
      >
        <div className={`px-6 py-4 border-b flex items-center justify-between transition-colors ${isDarkMode ? 'bg-black-900/50 border-black-800' : 'bg-slate-50/50 border-slate-100'}`}>
          <h2 className={`text-xl font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{issueToEdit ? 'Edit QA Issue' : 'New QA Issue'}</h2>
          <button onClick={onClose} className={`p-1 rounded-full transition-colors ${isDarkMode ? 'hover:bg-black-800' : 'hover:bg-slate-100'}`}>
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label className={`block text-sm font-semibold mb-2 transition-colors ${isDarkMode ? 'text-black-300' : 'text-slate-700'}`}>Select Project</label>
            <select 
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className={`w-full p-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${isDarkMode ? 'bg-black-950 border-black-800 text-white focus:ring-white focus:border-transparent' : 'bg-white border-slate-200 text-slate-700 focus:ring-slate-900'}`}
            >
              <option value="">No Project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label className={`block text-sm font-semibold mb-2 transition-colors ${isDarkMode ? 'text-black-300' : 'text-slate-700'}`}>Description</label>
            <textarea 
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What went wrong? Describe the steps to reproduce..."
              className={`w-full h-32 p-3 border rounded-xl focus:outline-none focus:ring-2 transition-all resize-none ${isDarkMode ? 'bg-black-950 border-black-800 text-white focus:ring-white focus:border-transparent placeholder:text-black-700' : 'bg-white border-slate-200 text-slate-700 focus:ring-slate-900'}`}
              required
            />
          </div>

          <div className="mb-8">
            <label className={`block text-sm font-semibold mb-2 transition-colors ${isDarkMode ? 'text-black-300' : 'text-slate-700'}`}>Screenshot (Optional)</label>
            {screenshot ? (
              <div className={`relative rounded-xl overflow-hidden border transition-colors ${isDarkMode ? 'bg-black-950 border-black-800' : 'bg-slate-50 border-slate-200'}`}>
                <img src={screenshot} alt="Preview" className="w-full h-48 object-contain" />
                <button 
                  type="button"
                  onClick={() => setScreenshot(null)}
                  className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-full shadow-lg hover:bg-rose-600 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`w-full py-10 border-2 border-dashed rounded-xl transition-all flex flex-col items-center gap-2 ${isDarkMode ? 'bg-black-950/50 border-black-800 text-black-600 hover:text-black-400 hover:border-black-700' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50/50'}`}
              >
                <Camera size={32} strokeWidth={1.5} />
                <span className="text-sm font-medium">Click to upload screenshot</span>
              </button>
            )}
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={onClose}
              className={`flex-1 py-3 px-4 border font-semibold rounded-xl transition-all active:scale-[0.98] ${isDarkMode ? 'bg-black-800 border-black-700 text-black-300 hover:bg-black-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting || !description.trim()}
              className={`flex-1 py-3 px-4 font-semibold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'bg-white hover:bg-black-100 text-black-950' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
            >
              {isSubmitting ? (
                <>
                  <div className={`w-4 h-4 border-2 border-t-white rounded-full animate-spin ${isDarkMode ? 'border-white/30' : 'border-white/30'}`} />
                  {issueToEdit ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                issueToEdit ? 'Save Changes' : 'Create Issue'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
