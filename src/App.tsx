import { useState, useEffect } from 'react';
import {
  MessageSquare,
  AlertTriangle,
  Clock,
  Upload as UploadIcon,
} from 'lucide-react';
import axios from 'axios';
import { DashboardCard } from './components/DashboardCard';
import { MessageList } from './components/MessageList';
import { UploadModal } from './components/UploadModal';
import { MessageDetailsModal } from './components/MessageDetailsModal';
import { BlacklistManager } from './components/BlacklistManager';
import { Reports } from './components/Reports';
import { DashboardFilters } from './components/DashboardFilters';
import type { SwiftMessage, BlacklistEntry, NameCheckResult, CommonEntity } from './types';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { useDarkMode } from './hooks/useDarkMode';
import { OfacChecker } from './utils/ofacChecker';
import { SDNList } from './components/SDNList';
import EntitySearch from './components/EntitySearch'; 
import { Language } from './utils/translations';
import { TranslationProvider } from './contexts/TranslationContext';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CommonEntitiesPage } from './components/CommonEntitiesPage';
import { Toaster } from 'react-hot-toast';
import { toast } from 'react-hot-toast';

const STORAGE_KEY = 'swift_messages';
const BLACKLIST_STORAGE_KEY = 'blacklist_entries';
const COMMON_ENTITIES_STORAGE_KEY = 'common_entities';

const checkAllFields = async (message: SwiftMessage): Promise<Record<string, NameCheckResult>> => {
  const results: Record<string, NameCheckResult> = {};

  // Check sender fields
  if (message.sender.name) {
    const checkResult = await OfacChecker.checkName(message.sender.name);
    results['sender_name'] = { ...checkResult, name: message.sender.name };
  }

  // Check CEO in sender's company details
  if (message.sender.company_details?.CEO) {
    const checkResult = await OfacChecker.checkName(message.sender.company_details.CEO);
    results['sender_ceo'] = { ...checkResult, name: message.sender.company_details.CEO };
  }

  // Check Founders in sender's company details
  if (message.sender.company_details?.Founders) {
    await Promise.all(
      message.sender.company_details.Founders.map(async (founder, index) => {
        if (founder.owner) {
          const checkResult = await OfacChecker.checkName(founder.owner);
          results[`sender_founder_${index + 1}`] = { ...checkResult, name: founder.owner };
        }
      })
    );
  }

  // Check receiver fields
  if (message.receiver.name) {
    const checkResult = await OfacChecker.checkName(message.receiver.name);
    results['receiver_name'] = { ...checkResult, name: message.receiver.name };
  }

  // Check CEO in receiver's company details
  if (message.receiver.CEO) {
    const checkResult = await OfacChecker.checkName(message.receiver.CEO);
    results['receiver_ceo'] = { ...checkResult, name: message.receiver.CEO };
  }

  // Check Founders in receiver's company details
  if (message.receiver.Founders) {
    await Promise.all(
      message.receiver.Founders.map(async (founder, index) => {
        if (founder.owner) {
          const checkResult = await OfacChecker.checkName(founder.owner);
          results[`receiver_founder_${index + 1}`] = { ...checkResult, name: founder.owner };
        }
      })
    );
  }

  // Check receiver bank name
  if (message.receiver.bankName) {
    const checkResult = await OfacChecker.checkName(message.receiver.bankName);
    results['receiver_bank'] = { ...checkResult, name: message.receiver.bankName };
  }

  return results;
};

const loadMessages = (): (SwiftMessage & { manuallyUpdated?: boolean })[] => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
};

const loadBlacklist = (): BlacklistEntry[] => {
  const saved = localStorage.getItem(BLACKLIST_STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
};

interface MessageChecks {
  [messageId: string]: {
    checks: Record<string, NameCheckResult>;
    lastAutoCheck?: string;
    status?: SwiftMessage['status'];
  };
}

export default function App() {
  const [isDark, setIsDark] = useDarkMode();
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'entity-screening' | 'common-entities' | 'blacklist' | 'sdn-list' | 'reports'>('dashboard');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<SwiftMessage | null>(null);
  const [messages, setMessages] = useState<(SwiftMessage & { manuallyUpdated?: boolean })[]>(loadMessages);
  const [filteredMessages, setFilteredMessages] = useState<SwiftMessage[]>(messages);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>(loadBlacklist);
  const [messageChecks, setMessageChecks] = useState<MessageChecks>({});
  const [isOfacInitialized, setIsOfacInitialized] = useState(false);
  const [language, setLanguage] = useState<Language>(() => 
    (localStorage.getItem('preferred_language') as Language) || 'en'
  );
  const [commonEntities, setCommonEntities] = useState<CommonEntity[]>(() => {
    const saved = localStorage.getItem(COMMON_ENTITIES_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const initializeOfacChecker = async () => {
      try {
        await OfacChecker.initialize();
        setIsOfacInitialized(true);
        console.log('OFAC Checker initialized successfully.');
      } catch (error) {
        console.error('Failed to initialize OFAC Checker:', error);
      }
    };
    initializeOfacChecker();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    setFilteredMessages(messages);
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(BLACKLIST_STORAGE_KEY, JSON.stringify(blacklist));
  }, [blacklist]);

  useEffect(() => {
    localStorage.setItem(COMMON_ENTITIES_STORAGE_KEY, JSON.stringify(commonEntities));
  }, [commonEntities]);

  const handleFilterChange = (filters: any) => {
    const filtered = messages.filter(message => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const searchMatch = 
          message.sender.name.toLowerCase().includes(searchLower) ||
          message.receiver.name.toLowerCase().includes(searchLower) ||
          message.sender.bankCode?.toLowerCase().includes(searchLower) ||
          message.receiver.bankCode?.toLowerCase().includes(searchLower) ||
          message.receiver.bankName?.toLowerCase().includes(searchLower) ||
          message.transactionRef.toLowerCase().includes(searchLower);

        if (!searchMatch) return false;
      }

      if (filters.senderName && !message.sender.name.toLowerCase().includes(filters.senderName.toLowerCase())) {
        return false;
      }

      if (filters.receiverName && !message.receiver.name.toLowerCase().includes(filters.receiverName.toLowerCase())) {
        return false;
      }

      if (filters.dateFrom && new Date(message.date) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(message.date) > new Date(filters.dateTo)) return false;

      const amount = parseFloat(message.amount);
      if (filters.amountFrom && amount < parseFloat(filters.amountFrom)) return false;
      if (filters.amountTo && amount > parseFloat(filters.amountTo)) return false;

      if (filters.reference && !message.transactionRef.toLowerCase().includes(filters.reference.toLowerCase())) {
        return false;
      }

      if (filters.bankName) {
        const bankNameLower = filters.bankName.toLowerCase();
        const bankMatch = 
          message.receiver.bankName?.toLowerCase().includes(bankNameLower) ||
          message.sender.bankCode?.toLowerCase().includes(bankNameLower) ||
          message.receiver.bankCode?.toLowerCase().includes(bankNameLower);

        if (!bankMatch) return false;
      }

      if (filters.status && message.status !== filters.status) return false;

      return true;
    });

    setFilteredMessages(filtered);
  };

  const handleViewMessage = async (id: string) => {
    const message = messages.find((m) => m.id === id);
    if (message) {
      if (!messageChecks[id]) {
        const checks = await checkAllFields(message);
        setMessageChecks(prev => ({
          ...prev,
          [id]: {
            checks,
            lastAutoCheck: new Date().toISOString()
          }
        }));
      }
      setSelectedMessage(message);
    }
  };

  const handleStoreChecks = (messageId: string, checks: Record<string, NameCheckResult>) => {
    setMessageChecks(prev => ({
      ...prev,
      [messageId]: {
        checks,
        lastAutoCheck: new Date().toISOString()
      }
    }));
  };

  const handleUpload = async (messageText: string, comments: string) => {
    try {
      const response = await axios.post(import.meta.env.VITE_BACKEND_URL2+'/api/process-swift', {
        message: messageText,
      });

      const { data } = response;
      const newMessage: SwiftMessage & { manuallyUpdated?: boolean } = {
        id: crypto.randomUUID(),
        transactionRef: data.transaction_reference || '',
        type: data.transaction_type || '',
        date: data.transaction_date || '',
        currency: data.transaction_currency || '',
        amount: data.transaction_amount || '',
        notes: comments,
        sender: {
          account: data.sender_account || '',
          inn: data.sender_inn || '',
          name: data.sender_name || '',
          address: data.sender_address || '',
          bankCode: data.sender_bank_code || '',
          sdnStatus: 'pending',
          company_details: data.company_info || {},
        },
        receiver: {
          account: data.receiver_account || '',
          transitAccount: data.receiver_transit_account || '',
          bankCode: data.receiver_bank_code || '',
          bankName: data.receiver_bank_name || '',
          name: data.receiver_name || '',
          inn: data.receiver_inn || '',
          kpp: data.receiver_kpp || '',
          sdnStatus: 'pending',
          CEO: data.receiver_info?.CEO || '',
          Founders: data.receiver_info?.Founders || [],
        },
        purpose: data.transaction_purpose || '',
        fees: data.transaction_fees || '',
        status: 'processing',
        manuallyUpdated: false
      };

      if (isOfacInitialized) {
        const checks = await checkAllFields(newMessage);
        setMessageChecks(prev => ({
          ...prev,
          [newMessage.id]: {
            checks,
            lastAutoCheck: new Date().toISOString()
          }
        }));
      }

      setMessages(prev => [...prev, newMessage]);
      setIsUploadModalOpen(false);
    } catch (error) {
      console.error('Error processing SWIFT message:', error);
      throw error;
    }
  };

  const handleAddBlacklistEntry = (entry: Omit<BlacklistEntry, 'id' | 'dateAdded'>) => {
    const newEntry: BlacklistEntry = {
      ...entry,
      id: crypto.randomUUID(),
      dateAdded: new Date().toISOString(),
    };
    setBlacklist(prev => [...prev, newEntry]);
  };

  const handleUpdateBlacklistEntry = (id: string, entry: Omit<BlacklistEntry, 'id' | 'dateAdded'>) => {
    setBlacklist(prev =>
      prev.map(item =>
        item.id === id
          ? { ...entry, id, dateAdded: item.dateAdded }
          : item
      )
    );
  };

  const handleDeleteBlacklistEntry = (id: string) => {
    setBlacklist(prev => prev.filter(entry => entry.id !== id));
  };

  const handleDeleteMessage = async (id: string) => {
    try {
        // Attempt to delete the message from the backend
        await axios.delete(import.meta.env.VITE_BACKEND_URL2+`/api/delete-message/${id}`);
    } catch (error) {
        console.error('Error deleting message from backend:', error);
    } finally {
        // Always remove the message from the frontend list
        setMessages((prev) => prev.filter((msg) => msg.id !== id));
        setMessageChecks((prev) => {
            const newChecks = { ...prev };
            delete newChecks[id];
            return newChecks;
        });
    }
};

  const handleStatusChange = async (id: string, status: SwiftMessage['status'], isAutomatic: boolean = false) => {
    try {
      // Update the status in the backend
      await axios.patch(import.meta.env.VITE_BACKEND_URL2+`/api/update-status/${id}`, { 
        status,
        isAutomatic 
      });

      // Update both the messages list and selected message if it exists
      setMessages(prev => 
        prev.map(msg => 
          msg.id === id 
            ? { ...msg, status, manuallyUpdated: !isAutomatic }
            : msg
        )
      );

      // Also update the selected message if it's currently open
      if (selectedMessage && selectedMessage.id === id) {
        setSelectedMessage(prev => 
          prev ? { ...prev, status, manuallyUpdated: !isAutomatic } : null
        );
      }

      // Update message checks if this was an automatic update
      if (isAutomatic) {
        setMessageChecks(prev => ({
          ...prev,
          [id]: {
            ...prev[id],
            lastAutoCheck: new Date().toISOString(),
            status
          }
        }));
      }

      // Save to localStorage or your backend
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleNotesChange = (id: string, notes: string) => {
    setMessages(prev =>
      prev.map(msg => (msg.id === id ? { ...msg, notes } : msg))
    );
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang as Language);
    window.location.reload();
  };

  const handleDeleteCommonEntity = (id: string) => {
    setCommonEntities(prev => prev.filter(entity => entity.id !== id));
  };

  const handleUpdateCommonEntity = (id: string, updates: Partial<CommonEntity>) => {
    setCommonEntities(prev => 
      prev.map(entity => 
        entity.id === id ? { ...entity, ...updates } : entity
      )
    );
  };

  const handleAddToCommonEntities = (entity: Omit<CommonEntity, 'id'>) => {
    console.log('Adding entity in App:', entity); // Debug log
    
    // Check for duplicates
    const isDuplicate = commonEntities.some(
      existingEntity => 
        existingEntity.name.toLowerCase() === entity.name.toLowerCase() ||
        (entity.inn && existingEntity.inn === entity.inn)
    );

    if (isDuplicate) {
      toast.error('This entity already exists in Common Entities', {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#ef4444',
          color: '#fff',
          borderRadius: '8px',
        },
      });
      return;
    }

    // Generate a unique ID that doesn't exist in current entities
    let newId: string;
    do {
      newId = crypto.randomUUID();
    } while (commonEntities.some(e => e.id === newId));

    const newEntity: CommonEntity = {
      ...entity,
      id: newId,
    };
    
    // Update state with the new entity
    setCommonEntities(prevEntities => {
      const updatedEntities = [...prevEntities, newEntity];
      // Save to localStorage immediately after updating state
      try {
        localStorage.setItem(COMMON_ENTITIES_STORAGE_KEY, JSON.stringify(updatedEntities));
        console.log('Updated entities in localStorage:', updatedEntities); // Debug log
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
      return updatedEntities;
    });
    
    toast.success('Entity added successfully', {
      duration: 3000,
      position: 'top-right',
      style: {
        background: '#008766',
        color: '#fff',
        borderRadius: '8px',
      },
    });
  };

  return (
    <TranslationProvider language={language}>
      <Router>
        <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900 transition-colors">
          <Navbar 
            currentPage={currentPage} 
            onNavigate={setCurrentPage}
            isDark={isDark}
            onToggleTheme={() => setIsDark(!isDark)}
            onLanguageChange={handleLanguageChange}
          />
          
          <Toaster />
          
          <main className="flex-grow container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <DashboardCard
                      title="Total Messages"
                      value={filteredMessages.length}
                      icon={MessageSquare}
                    />
                    <DashboardCard
                      title="Flagged Messages"
                      value={filteredMessages.filter(m => m.status === 'flagged').length}
                      icon={AlertTriangle}
                    />
                    <DashboardCard
                      title="Processing"
                      value={filteredMessages.filter(m => m.status === 'processing').length}
                      icon={Clock}
                    />
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="flex-grow">
                        <DashboardFilters onFilterChange={handleFilterChange} />
                      </div>
                      <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="flex-shrink-0 h-10 flex items-center px-4 bg-[#008766] text-white rounded-lg hover:bg-[#007055] dark:bg-[#007055] dark:hover:bg-[#006045] transition-colors"
                      >
                        <UploadIcon className="w-4 h-4 mr-2" />
                        New Message
                      </button>
                    </div>
                  </div>

                  <MessageList
                    messages={filteredMessages}
                    onViewMessage={handleViewMessage}
                    onDeleteMessage={handleDeleteMessage}
                    onStatusChange={handleStatusChange}
                  />

                  <UploadModal
                    isOpen={isUploadModalOpen}
                    onClose={() => setIsUploadModalOpen(false)}
                    onUpload={handleUpload}
                  />

                  {selectedMessage && (
                    <MessageDetailsModal
                      message={selectedMessage}
                      isOpen={!!selectedMessage}
                      onClose={() => setSelectedMessage(null)}
                      onStatusChange={handleStatusChange}
                      onNotesChange={handleNotesChange}
                      blacklist={blacklist}
                      savedChecks={messageChecks[selectedMessage.id]?.checks}
                      onStoreChecks={(checks) => handleStoreChecks(selectedMessage.id, checks)}
                    />
                  )}
                </>
              } />
              <Route path="/entity-screening" element={
                <EntitySearch 
                  onAddToCommonEntities={handleAddToCommonEntities}
                  existingEntities={commonEntities}
                />
              } />
              <Route path="/common-entities" element={
                <CommonEntitiesPage 
                  entities={commonEntities}
                  onDeleteEntity={handleDeleteCommonEntity}
                  onUpdateEntity={handleUpdateCommonEntity}
                  onAddEntity={handleAddToCommonEntities}
                />
              } />
              <Route path="/blacklist" element={
                <BlacklistManager
                  entries={blacklist}
                  onAddEntry={handleAddBlacklistEntry}
                  onUpdateEntry={handleUpdateBlacklistEntry}
                  onDeleteEntry={handleDeleteBlacklistEntry}
                />
              } />
              <Route path="/sdn-list" element={<SDNList />} />
              <Route path="/reports" element={<Reports messages={messages} />} />
            </Routes>
          </main>

          <Footer />
        </div>
      </Router>
    </TranslationProvider>
  );
}
