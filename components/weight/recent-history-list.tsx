"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, ArrowUp, ArrowDown, Edit2, Trash2, FileDown } from 'lucide-react'; // Example icons
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
<<<<<<< HEAD
import { toast } from 'sonner'; // Import toast from sonner
import { EmptyState } from "@/components/ui/empty-state"; // Import EmptyState
import { ClipboardList, AlertTriangle } from "lucide-react"; // Import icons for EmptyState
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
=======
>>>>>>> d7c365a (feat(weight): implement RecentHistoryList and GET API for weight logs)

// This type should match the structure returned by your API GET /api/weight-logs
interface WeightLogEntry {
  id: string;
  date: string; // ISO string date
  weight: number;
  notes?: string | null;
  measured_by?: string | null; // User ID or name
<<<<<<< HEAD
  cat_id?: string; // Ensure cat_id is part of the entry if needed for editing/context
=======
  // Add other fields if returned and needed, e.g., cat_id
>>>>>>> d7c365a (feat(weight): implement RecentHistoryList and GET API for weight logs)
}

interface RecentHistoryListProps {
  catId: string;
<<<<<<< HEAD
  userId: string;
  onEditRequest: (log: WeightLogEntry) => void; // Added prop
  onDeleteRequest: (logId: string) => Promise<boolean>; // Added prop, returns promise for success status
  logChangeTimestamp: number; // Added to trigger re-fetch
  // initialLogs?: WeightLogEntry[]; // Could pass initial logs to avoid loading flicker
}

const RecentHistoryList: React.FC<RecentHistoryListProps> = ({ catId, userId, onEditRequest, onDeleteRequest, logChangeTimestamp }) => {
=======
  // initialLogs?: WeightLogEntry[]; // Could pass initial logs to avoid loading flicker
}

const RecentHistoryList: React.FC<RecentHistoryListProps> = ({ catId }) => {
>>>>>>> d7c365a (feat(weight): implement RecentHistoryList and GET API for weight logs)
  const [logs, setLogs] = useState<WeightLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768); // md breakpoint
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
<<<<<<< HEAD
    if (!catId || !userId) {
      setIsLoading(false);
      // setError(!catId ? 'No Cat ID provided to fetch history.' : 'User ID not provided.');
      // Avoid setting error here if props are not ready, parent should handle this.
      // Let it attempt to fetch if catId/userId become available.
=======
    if (!catId) {
      setIsLoading(false);
      setError('No Cat ID provided to fetch history.');
>>>>>>> d7c365a (feat(weight): implement RecentHistoryList and GET API for weight logs)
      setLogs([]);
      return;
    }

    const fetchLogs = async () => {
      setIsLoading(true);
      setError(null);
      try {
<<<<<<< HEAD
        const response = await fetch(`/api/weight-logs?catId=${catId}`, {
          headers: {
            'X-User-ID': userId
          }
        });
        if (!response.ok) {
          const errData = await response.json();
          const errorMessage = errData.error || 'Failed to fetch weight logs';
          throw new Error(errorMessage);
        }
        const data: any[] = await response.json(); // Temporarily use any[] for parsing
        
        // Parse weight from string to number
        const parsedData: WeightLogEntry[] = data.map(log => ({
          ...log,
          weight: typeof log.weight === 'string' ? parseFloat(log.weight) : (typeof log.weight === 'number' ? log.weight : 0), // Ensure it's a number, default to 0 if unparsable
          date: log.date // Assuming date is already correctly formatted string
        }));
        
        setLogs(parsedData);
        setError(null); // Clear any previous error on success
      } catch (err) {
        const errorMessage = (err as Error).message;
        setError(errorMessage); // Optionally keep for inline display
        setLogs([]); // Clear logs on error
        toast.error("Erro ao Buscar Histórico", { // Sonner error toast
          description: errorMessage,
        });
=======
        const response = await fetch(`/api/weight-logs?catId=${catId}`);
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to fetch weight logs');
        }
        const data: WeightLogEntry[] = await response.json();
        setLogs(data);
      } catch (err) {
        setError((err as Error).message);
        setLogs([]); // Clear logs on error
>>>>>>> d7c365a (feat(weight): implement RecentHistoryList and GET API for weight logs)
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
<<<<<<< HEAD
  }, [catId, userId, logChangeTimestamp]);

  const handleEdit = (log: WeightLogEntry) => {
    onEditRequest(log);
  };

  const handleDelete = async (logId: string) => {
    // Consider adding a confirmation dialog here using sonner or a custom modal
    // For example: if (!confirm('Are you sure you want to delete this log?')) return;
    try {
      const success = await onDeleteRequest(logId);
      if (success) {
        // toast.success("Registro excluído com sucesso."); // REMOVED: Parent will show the toast
        // The component will now re-fetch due to logChangeTimestamp prop changing in the parent
        // No need to manually call fetchLogs() or refetch() here.
      } else {
        // Deletion was not successful, onDeleteRequest in parent should handle toast for failure.
      }
    } catch (error) {
      console.error("Error during delete operation:", error);
      toast.error("Ocorreu um erro ao tentar excluir o registro.");
    }
  };
=======
  }, [catId]);
>>>>>>> d7c365a (feat(weight): implement RecentHistoryList and GET API for weight logs)

  const getTrendIcon = (currentLog: WeightLogEntry, previousLog?: WeightLogEntry) => {
    if (!previousLog) return null;
    if (currentLog.weight > previousLog.weight) return <ArrowUp className="h-4 w-4 text-green-500 ml-1" />;
<<<<<<< HEAD
    if (currentLog.weight < previousLog.weight) return <ArrowDown className="h-4 w-4 text-destructive ml-1" />;
=======
    if (currentLog.weight < previousLog.weight) return <ArrowDown className="h-4 w-4 text-red-500 ml-1" />;
>>>>>>> d7c365a (feat(weight): implement RecentHistoryList and GET API for weight logs)
    return null; // Or a neutral icon for no change
  };

  const formattedLogs = useMemo(() => {
    return logs.map((log, index) => {
      const previousLog = logs[index + 1]; // Logs are desc, so previous is next in array
      return {
        ...log,
<<<<<<< HEAD
        displayDate: new Date(log.date).toLocaleDateString('pt-BR', { year: 'numeric', month: 'short', day: 'numeric' }),
=======
        displayDate: new Date(log.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
>>>>>>> d7c365a (feat(weight): implement RecentHistoryList and GET API for weight logs)
        trendIcon: getTrendIcon(log, previousLog),
      };
    });
  }, [logs]);

  if (isLoading) {
    return (
<<<<<<< HEAD
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Histórico de Peso Recente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 pt-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isLoading && error && logs.length === 0) {
    // Display error state using EmptyState if logs are empty due to an error
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Histórico de Peso Recente</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState 
            IconComponent={AlertTriangle} 
            title="Erro ao Carregar Histórico"
            description={error || "Falha ao carregar o histórico de peso. Verifique as notificações ou tente novamente mais tarde."}
            className="mt-4"
          />
        </CardContent>
      </Card>
    );
  }

  if (!isLoading && !error && formattedLogs.length === 0) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Histórico de Peso Recente</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            IconComponent={ClipboardList}
            title="Nenhum Histórico de Peso"
            description="Nenhum registro de peso foi feito para este gato ainda. Adicione um novo registro para começar a acompanhar!"
            actionButton={ 
              <Button onClick={() => { /* TODO: Trigger QuickLogPanel or navigate to add log */ console.log('Add new log clicked'); }} >
                Registrar Primeiro Peso
              </Button>
            }
            className="mt-4"
          />
        </CardContent>
      </Card>
    );
=======
      <div className="space-y-2 pt-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500 pt-4">Error: {error}</p>;
  }

  if (formattedLogs.length === 0) {
    return <p className="text-muted-foreground pt-4">No weight history found for this cat.</p>;
>>>>>>> d7c365a (feat(weight): implement RecentHistoryList and GET API for weight logs)
  }

  const renderLogItemContent = (log: typeof formattedLogs[0]) => (
    <div className="grid grid-cols-3 gap-2 p-2 text-sm items-center">
      <div className="col-span-3 sm:col-span-1 font-medium flex items-center">
        {log.displayDate}
      </div>
      <div className="col-span-1 sm:col-span-1 flex items-center">
        {log.weight.toFixed(2)} kg {log.trendIcon}
      </div>
      <div className="col-span-2 sm:col-span-1 text-muted-foreground truncate">
        {log.notes || '-'}
      </div>
      {/* Actions will be on the row/accordion item level */}
    </div>
  );
  
  const renderLogItemActions = (log: WeightLogEntry) => (
    <div className="flex items-center justify-end space-x-1">
<<<<<<< HEAD
      <Button variant="ghost" size="icon" onClick={() => handleEdit(log)} aria-label="Editar registro">
        <Edit2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => handleDelete(log.id)} aria-label="Excluir registro" className="text-destructive hover:text-destructive/90">
=======
      <Button variant="ghost" size="icon" onClick={() => console.log('Edit', log.id)} aria-label="Edit log">
        <Edit2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => console.log('Delete', log.id)} aria-label="Delete log" className="text-red-500 hover:text-red-600">
>>>>>>> d7c365a (feat(weight): implement RecentHistoryList and GET API for weight logs)
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
<<<<<<< HEAD
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Histórico de Peso Recente</CardTitle>
        {/* TODO: Add Export Dropdown here if desired when there IS data */}
      </CardHeader>
      <CardContent>
        {isMobile ? (
          <Accordion type="single" collapsible className="w-full">
            {formattedLogs.map((log, index) => (
              <AccordionItem value={`item-${index}`} key={log.id || index}>
                <AccordionTrigger>
                  <div className="flex justify-between items-center w-full pr-2">
                    <span>{log.displayDate}</span>
                    <div className="flex items-center">
                      <span>{log.weight.toFixed(2)} kg</span>
                      {getTrendIcon(log, formattedLogs[index + 1])}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {renderLogItemContent(log)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Peso</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formattedLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.displayDate}</TableCell>
                  <TableCell className="flex items-center">{log.weight.toFixed(2)} kg {log.trendIcon}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">{log.notes || '-'}</TableCell>
                  <TableCell className="text-right">{renderLogItemActions(log)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
=======
    <div className="mt-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">Recent Weight Logs</h3>
        {formattedLogs.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FileDown className="h-4 w-4 mr-2" /> Export <ChevronDown className="h-4 w-4 ml-1 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => console.log('Export PDF')}>Export as PDF</DropdownMenuItem>
              {/* Add other export options if needed */}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {isMobile ? (
        <Accordion type="single" collapsible className="w-full">
          {formattedLogs.map((log) => (
            <AccordionItem value={log.id} key={log.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex justify-between w-full pr-2 items-center">
                    <span>{log.displayDate} - <strong>{log.weight.toFixed(2)} kg</strong></span>
                    {log.trendIcon}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pl-2 pr-1 py-1 space-y-1">
                    {log.notes && <p className="text-sm text-muted-foreground"><strong className="text-foreground">Notes:</strong> {log.notes}</p>}
                    <div className="pt-1 flex justify-end">
                        {renderLogItemActions(log)}
                    </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {formattedLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">{log.displayDate}</TableCell>
                <TableCell className="flex items-center">{log.weight.toFixed(2)} kg {log.trendIcon}</TableCell>
                <TableCell className="text-muted-foreground max-w-xs truncate">{log.notes || '-'}</TableCell>
                <TableCell className="text-right">{renderLogItemActions(log)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
>>>>>>> d7c365a (feat(weight): implement RecentHistoryList and GET API for weight logs)
  );
};

export default RecentHistoryList; 