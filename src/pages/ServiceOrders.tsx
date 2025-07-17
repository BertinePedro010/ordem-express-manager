import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, ClipboardList, Eye, Printer, Trash2, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateServiceOrderModal } from "@/components/CreateServiceOrderModal";

interface ServiceOrder {
  id: string;
  status: string;
  payment_status: string;
  problem_description: string;
  solution_description?: string;
  value?: number;
  created_at: string;
  updated_at: string;
  clients: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  equipments: {
    id: string;
    type: string;
    brand?: string;
    model?: string;
    serial_number?: string;
  };
  profiles: {
    name: string;
  };
}

interface Client {
  id: string;
  name: string;
}

export default function ServiceOrders() {
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<ServiceOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadServiceOrders();
    loadClients();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [serviceOrders, statusFilter, clientFilter]);

  const loadServiceOrders = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('service_orders')
        .select(`
          *,
          clients (id, name, phone, email, address),
          equipments (id, type, brand, model, serial_number),
          profiles!service_orders_technician_id_fkey (name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setServiceOrders(data || []);
    } catch (error) {
      console.error('Error loading service orders:', error);
      toast({
        title: "Erro ao carregar ordens de serviço",
        description: "Não foi possível carregar as ordens de serviço.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...serviceOrders];

    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    if (clientFilter !== "all") {
      filtered = filtered.filter(order => order.clients.id === clientFilter);
    }

    setFilteredOrders(filtered);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'em_andamento':
        return <Badge className="status-in-progress">Em andamento</Badge>;
      case 'aguardando_peca':
        return <Badge className="status-waiting">Aguardando peça</Badge>;
      case 'finalizado':
        return <Badge className="status-completed">Finalizado</Badge>;
      case 'entregue':
        return <Badge className="status-delivered">Entregue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentBadge = (paymentStatus: string) => {
    return paymentStatus === 'pago' ? (
      <Badge className="status-completed">Pago</Badge>
    ) : (
      <Badge className="status-pending">Pendente</Badge>
    );
  };

  const handleViewDetails = (order: ServiceOrder) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const handlePrint = (order: ServiceOrder) => {
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ordem de Serviço #${order.id.slice(-8)}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 40px;
            line-height: 1.6;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          .os-number {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
          }
          .section {
            margin: 20px 0;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
          }
          .section-title {
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 10px;
            color: #2563eb;
            border-bottom: 1px solid #eee;
            padding-bottom: 5px;
          }
          .field {
            margin: 8px 0;
          }
          .field strong {
            min-width: 120px;
            display: inline-block;
          }
          .status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
          }
          .status-completed { background: #dcfce7; color: #166534; }
          .status-pending { background: #fef3c7; color: #92400e; }
          .status-in-progress { background: #dbeafe; color: #1e40af; }
          .status-waiting { background: #fde68a; color: #b45309; }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ORDEM DE SERVIÇO</h1>
          <div class="os-number">#${order.id.slice(-8)}</div>
        </div>

        <div class="section">
          <div class="section-title">DADOS DO CLIENTE</div>
          <div class="field"><strong>Nome:</strong> ${order.clients.name}</div>
          <div class="field"><strong>Telefone:</strong> ${order.clients.phone || 'Não informado'}</div>
          <div class="field"><strong>E-mail:</strong> ${order.clients.email || 'Não informado'}</div>
          <div class="field"><strong>Endereço:</strong> ${order.clients.address || 'Não informado'}</div>
        </div>

        <div class="section">
          <div class="section-title">DADOS DO EQUIPAMENTO</div>
          <div class="field"><strong>Tipo:</strong> ${order.equipments.type}</div>
          <div class="field"><strong>Marca:</strong> ${order.equipments.brand || 'Não informado'}</div>
          <div class="field"><strong>Modelo:</strong> ${order.equipments.model || 'Não informado'}</div>
          <div class="field"><strong>Nº Série:</strong> ${order.equipments.serial_number || 'Não informado'}</div>
        </div>

        <div class="section">
          <div class="section-title">DESCRIÇÃO DO PROBLEMA</div>
          <div>${order.problem_description}</div>
        </div>

        ${order.solution_description ? `
        <div class="section">
          <div class="section-title">SOLUÇÃO APLICADA</div>
          <div>${order.solution_description}</div>
        </div>
        ` : ''}

        <div class="section">
          <div class="section-title">INFORMAÇÕES DA OS</div>
          <div class="field"><strong>Status:</strong> 
            <span class="status ${
              order.status === 'finalizado' || order.status === 'entregue' ? 'status-completed' :
              order.status === 'em_andamento' ? 'status-in-progress' :
              order.status === 'aguardando_peca' ? 'status-waiting' : 'status-pending'
            }">
              ${order.status === 'em_andamento' ? 'Em andamento' :
                order.status === 'aguardando_peca' ? 'Aguardando peça' :
                order.status === 'finalizado' ? 'Finalizado' :
                order.status === 'entregue' ? 'Entregue' : order.status}
            </span>
          </div>
          <div class="field"><strong>Pagamento:</strong>
            <span class="status ${order.payment_status === 'pago' ? 'status-completed' : 'status-pending'}">
              ${order.payment_status === 'pago' ? 'Pago' : 'Pendente'}
            </span>
          </div>
          <div class="field"><strong>Valor:</strong> ${order.value ? `R$ ${order.value.toFixed(2)}` : 'Não informado'}</div>
          <div class="field"><strong>Técnico:</strong> ${order.profiles.name}</div>
          <div class="field"><strong>Data Criação:</strong> ${new Date(order.created_at).toLocaleDateString('pt-BR')}</div>
        </div>

        <div class="footer">
          <p>Este documento foi gerado automaticamente pelo sistema Ordem Express</p>
          <p>Data de impressão: ${new Date().toLocaleString('pt-BR')}</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
      </html>
    `;

    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('service_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "OS excluída!",
        description: "A ordem de serviço foi removida do sistema.",
      });

      loadServiceOrders();
    } catch (error) {
      console.error('Error deleting service order:', error);
      toast({
        title: "Erro ao excluir OS",
        description: "Não foi possível excluir a ordem de serviço.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando ordens de serviço...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </Button>
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ClipboardList className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-primary">Ordens de Serviço</h1>
            </div>
          </div>
          <CreateServiceOrderModal onServiceOrderCreated={loadServiceOrders} />
        </div>

        {/* Filters */}
        <Card className="shadow-md mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="w-5 h-5" />
              <span>Filtros</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="em_andamento">Em andamento</SelectItem>
                    <SelectItem value="aguardando_peca">Aguardando peça</SelectItem>
                    <SelectItem value="finalizado">Finalizado</SelectItem>
                    <SelectItem value="entregue">Entregue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Cliente</label>
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Lista de Ordens de Serviço</span>
              <Badge variant="outline">{filteredOrders.length} OS encontradas</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  {serviceOrders.length === 0 ? "Nenhuma OS cadastrada" : "Nenhuma OS encontrada com os filtros aplicados"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {serviceOrders.length === 0 ? "Comece criando sua primeira ordem de serviço" : "Tente ajustar os filtros ou criar uma nova OS"}
                </p>
                <CreateServiceOrderModal onServiceOrderCreated={loadServiceOrders} />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>OS #</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Equipamento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">#{order.id.slice(-8)}</TableCell>
                        <TableCell>{order.clients.name}</TableCell>
                        <TableCell>
                          {order.equipments.type} {order.equipments.brand && `- ${order.equipments.brand}`}
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>{getPaymentBadge(order.payment_status)}</TableCell>
                        <TableCell>
                          {order.value ? `R$ ${order.value.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell>
                          {new Date(order.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(order)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePrint(order)}
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir esta ordem de serviço? Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(order.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Modal */}
        <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Detalhes da OS #{selectedOrder?.id.slice(-8)}</span>
                {selectedOrder && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrint(selectedOrder)}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Cliente</h3>
                  <div className="bg-muted/50 p-3 rounded">
                    <p><strong>Nome:</strong> {selectedOrder.clients.name}</p>
                    <p><strong>Telefone:</strong> {selectedOrder.clients.phone || 'Não informado'}</p>
                    <p><strong>E-mail:</strong> {selectedOrder.clients.email || 'Não informado'}</p>
                    <p><strong>Endereço:</strong> {selectedOrder.clients.address || 'Não informado'}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Equipamento</h3>
                  <div className="bg-muted/50 p-3 rounded">
                    <p><strong>Tipo:</strong> {selectedOrder.equipments.type}</p>
                    <p><strong>Marca:</strong> {selectedOrder.equipments.brand || 'Não informado'}</p>
                    <p><strong>Modelo:</strong> {selectedOrder.equipments.model || 'Não informado'}</p>
                    <p><strong>Nº Série:</strong> {selectedOrder.equipments.serial_number || 'Não informado'}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Problema Reportado</h3>
                  <div className="bg-muted/50 p-3 rounded">
                    <p>{selectedOrder.problem_description}</p>
                  </div>
                </div>

                {selectedOrder.solution_description && (
                  <div>
                    <h3 className="font-semibold mb-2">Solução Aplicada</h3>
                    <div className="bg-muted/50 p-3 rounded">
                      <p>{selectedOrder.solution_description}</p>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-2">Informações da OS</h3>
                  <div className="bg-muted/50 p-3 rounded space-y-2">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      {getStatusBadge(selectedOrder.status)}
                    </div>
                    <div className="flex justify-between">
                      <span>Pagamento:</span>
                      {getPaymentBadge(selectedOrder.payment_status)}
                    </div>
                    <div className="flex justify-between">
                      <span>Valor:</span>
                      <span>{selectedOrder.value ? `R$ ${selectedOrder.value.toFixed(2)}` : 'Não informado'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Técnico:</span>
                      <span>{selectedOrder.profiles.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Criado em:</span>
                      <span>{new Date(selectedOrder.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Atualizado em:</span>
                      <span>{new Date(selectedOrder.updated_at).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}