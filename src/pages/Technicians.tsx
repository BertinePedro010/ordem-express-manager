import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Key } from "lucide-react";
import { CreateTechnicianModal } from "@/components/CreateTechnicianModal";
import { EditTechnicianModal } from "@/components/EditTechnicianModal";
import { ResetPasswordModal } from "@/components/ResetPasswordModal";
import { useToast } from "@/hooks/use-toast";

interface Technician {
  id: string;
  name: string;
  phone: string | null;
  position: string | null;
  status: string;
  user_id: string;
  created_at: string;
  user_type: string;
}

export default function Technicians() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const [currentUserType, setCurrentUserType] = useState<string>("");
  const { toast } = useToast();

  const fetchTechnicians = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) return;

      // Get current user profile
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("user_id", session.session.user.id)
        .single();

      if (currentProfile) {
        setCurrentUserType(currentProfile.user_type);
      }

      // Only admins can view all technicians
      if (currentProfile?.user_type !== "admin") {
        toast({
          title: "Acesso negado",
          description: "Apenas administradores podem gerenciar técnicos.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_type", "tecnico")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTechnicians(data || []);
    } catch (error) {
      console.error("Erro ao buscar técnicos:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar técnicos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTechnician = async (technician: Technician) => {
    if (!confirm(`Tem certeza que deseja excluir o técnico ${technician.name}?`)) {
      return;
    }

    try {
      // Delete from auth.users (cascade will handle profiles)
      const { error: authError } = await supabase.auth.admin.deleteUser(technician.user_id);
      
      if (authError) throw authError;

      toast({
        title: "Sucesso",
        description: "Técnico excluído com sucesso.",
      });
      
      fetchTechnicians();
    } catch (error) {
      console.error("Erro ao excluir técnico:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir técnico.",
        variant: "destructive",
      });
    }
  };

  const handleStatusToggle = async (technician: Technician) => {
    const newStatus = technician.status === "ativo" ? "inativo" : "ativo";
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus })
        .eq("id", technician.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Status do técnico alterado para ${newStatus}.`,
      });

      fetchTechnicians();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast({
        title: "Erro",
        description: "Erro ao alterar status do técnico.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchTechnicians();
  }, []);

  if (currentUserType !== "admin") {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Acesso negado. Apenas administradores podem gerenciar técnicos.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gerenciar Técnicos</h1>
          <p className="text-muted-foreground">Cadastre e gerencie técnicos do sistema</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Técnico
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Técnicos Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p>Carregando...</p>
            </div>
          ) : technicians.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Nenhum técnico cadastrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data de Cadastro</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {technicians.map((technician) => (
                  <TableRow key={technician.id}>
                    <TableCell className="font-medium">{technician.name}</TableCell>
                    <TableCell>{technician.phone || "-"}</TableCell>
                    <TableCell>{technician.position || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={technician.status === "ativo" ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => handleStatusToggle(technician)}
                      >
                        {technician.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(technician.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTechnician(technician);
                            setIsEditModalOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTechnician(technician);
                            setIsResetPasswordModalOpen(true);
                          }}
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTechnician(technician)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateTechnicianModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={fetchTechnicians}
      />

      {selectedTechnician && (
        <>
          <EditTechnicianModal
            open={isEditModalOpen}
            onOpenChange={setIsEditModalOpen}
            technician={selectedTechnician}
            onSuccess={fetchTechnicians}
          />
          <ResetPasswordModal
            open={isResetPasswordModalOpen}
            onOpenChange={setIsResetPasswordModalOpen}
            technician={selectedTechnician}
          />
        </>
      )}
    </div>
  );
}