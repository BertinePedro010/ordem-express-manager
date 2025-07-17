import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ClipboardList, 
  Users, 
  Wrench, 
  DollarSign, 
  LogOut,
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
  Package
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User, Session } from '@supabase/supabase-js';
import { CreateClientModal } from "@/components/CreateClientModal";
import { CreateEquipmentModal } from "@/components/CreateEquipmentModal";
import { CreateServiceOrderModal } from "@/components/CreateServiceOrderModal";

interface Profile {
  id: string;
  name: string;
  user_type: string;
  phone?: string;
}

interface ServiceOrder {
  id: string;
  status: string;
  payment_status: string;
  problem_description: string;
  value?: number;
  created_at: string;
  clients: {
    name: string;
  };
  equipments: {
    type: string;
    brand?: string;
  };
}

interface Stats {
  totalOrders: number;
  openOrders: number;
  completedOrders: number;
  pendingPayments: number;
  monthlyRevenue: number;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    openOrders: 0,
    completedOrders: 0,
    pendingPayments: 0,
    monthlyRevenue: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            loadUserProfile(session.user.id);
            loadServiceOrders();
          }, 0);
        } else {
          navigate('/auth');
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        loadUserProfile(session.user.id);
        loadServiceOrders();
      } else {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
      // Não mostra toast de erro, pois o perfil pode estar sendo criado
    }
  };

  const loadServiceOrders = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('service_orders')
        .select(`
          *,
          clients (name),
          equipments (type, brand)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      setServiceOrders(data || []);
      calculateStats(data || []);
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

  const calculateStats = (orders: ServiceOrder[]) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
    });

    const totalOrders = orders.length;
    const openOrders = orders.filter(order => 
      order.status === 'em_andamento' || order.status === 'aguardando_peca'
    ).length;
    const completedOrders = orders.filter(order => 
      order.status === 'finalizado' || order.status === 'entregue'
    ).length;
    const pendingPayments = orders.filter(order => 
      order.payment_status === 'pendente'
    ).length;

    const monthlyRevenue = monthlyOrders
      .filter(order => order.payment_status === 'pago')
      .reduce((total, order) => total + (order.value || 0), 0);

    setStats({
      totalOrders,
      openOrders,
      completedOrders,
      pendingPayments,
      monthlyRevenue
    });
  };

  const handleSignOut = async () => {
    try {
      // Clean up auth state
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });

      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Ignore errors
      }
      
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Erro ao sair",
        description: "Houve um problema ao fazer logout.",
        variant: "destructive",
      });
    }
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="bg-white shadow-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wrench className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary">Ordem Express</h1>
                <p className="text-sm text-muted-foreground">
                  Bem-vindo, {profile?.name || user?.email}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="flex items-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de OS</CardTitle>
              <ClipboardList className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                Ordens de serviço cadastradas
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.openOrders}</div>
              <p className="text-xs text-muted-foreground">
                OS em andamento
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Finalizadas</CardTitle>
              <CheckCircle className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completedOrders}</div>
              <p className="text-xs text-muted-foreground">
                OS concluídas
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturamento</CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R$ {stats.monthlyRevenue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Receita do mês
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/service-orders')}>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <ClipboardList className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium">Ordens de Serviço</h3>
              <p className="text-sm text-muted-foreground">
                Ver todas as OS
              </p>
            </CardHeader>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/clients')}>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium">Clientes</h3>
              <p className="text-sm text-muted-foreground">
                Gerenciar clientes
              </p>
            </CardHeader>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/equipments')}>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium">Equipamentos</h3>
              <p className="text-sm text-muted-foreground">
                Gerenciar equipamentos
              </p>
            </CardHeader>
          </Card>
        </div>

        {/* Create Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <CreateServiceOrderModal onServiceOrderCreated={loadServiceOrders} />
            </CardHeader>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <CreateClientModal onClientCreated={loadServiceOrders} />
            </CardHeader>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <CreateEquipmentModal onEquipmentCreated={loadServiceOrders} />
            </CardHeader>
          </Card>
        </div>

        {/* Recent Service Orders */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ClipboardList className="w-5 h-5" />
              <span>Ordens de Serviço Recentes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {serviceOrders.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nenhuma ordem de serviço encontrada
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Comece criando sua primeira OS!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {serviceOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="font-medium">{order.clients.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.equipments.type} {order.equipments.brand && `- ${order.equipments.brand}`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {order.problem_description}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {order.value ? `R$ ${order.value.toFixed(2)}` : 'Sem valor'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex flex-col space-y-1">
                        {getStatusBadge(order.status)}
                        {getPaymentBadge(order.payment_status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}