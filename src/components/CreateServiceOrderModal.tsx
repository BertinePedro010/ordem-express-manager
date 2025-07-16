import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, Plus } from "lucide-react";

interface Client {
  id: string;
  name: string;
}

interface Equipment {
  id: string;
  type: string;
  brand?: string;
  model?: string;
  client_id: string;
}

interface Profile {
  id: string;
  name: string;
  user_type: string;
}

interface CreateServiceOrderModalProps {
  onServiceOrderCreated?: () => void;
}

export function CreateServiceOrderModal({ onServiceOrderCreated }: CreateServiceOrderModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [technicians, setTechnicians] = useState<Profile[]>([]);
  const [formData, setFormData] = useState({
    client_id: "",
    equipment_id: "",
    technician_id: "",
    problem_description: "",
    value: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Carregar clientes
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');

      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      // Carregar equipamentos
      const { data: equipmentsData, error: equipmentsError } = await supabase
        .from('equipments')
        .select('id, type, brand, model, client_id')
        .eq('user_id', user.id)
        .order('type');

      if (equipmentsError) throw equipmentsError;
      setEquipments(equipmentsData || []);

      // Carregar técnicos
      const { data: techniciansData, error: techniciansError } = await supabase
        .from('profiles')
        .select('id, name, user_type')
        .eq('user_type', 'tecnico')
        .order('name');

      if (techniciansError) throw techniciansError;
      setTechnicians(techniciansData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from('service_orders')
        .insert([
          {
            client_id: formData.client_id,
            equipment_id: formData.equipment_id,
            technician_id: formData.technician_id,
            problem_description: formData.problem_description,
            value: formData.value ? parseFloat(formData.value) : null,
            user_id: user.id
          }
        ]);

      if (error) throw error;

      toast({
        title: "Ordem de serviço criada com sucesso!",
        description: "A OS foi adicionada ao sistema.",
      });

      setFormData({ client_id: "", equipment_id: "", technician_id: "", problem_description: "", value: "" });
      setOpen(false);
      onServiceOrderCreated?.();
    } catch (error) {
      console.error('Error creating service order:', error);
      toast({
        title: "Erro ao criar ordem de serviço",
        description: "Não foi possível criar a OS. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEquipments = equipments.filter(eq => eq.client_id === formData.client_id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="w-full h-full cursor-pointer">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
            <Plus className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-medium">Nova OS</h3>
          <p className="text-sm text-muted-foreground text-center">
            Criar uma nova ordem de serviço
          </p>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <ClipboardList className="w-5 h-5" />
            <span>Nova Ordem de Serviço</span>
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client">Cliente *</Label>
            <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value, equipment_id: "" })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="equipment">Equipamento *</Label>
            <Select value={formData.equipment_id} onValueChange={(value) => setFormData({ ...formData, equipment_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um equipamento" />
              </SelectTrigger>
              <SelectContent>
                {filteredEquipments.map((equipment) => (
                  <SelectItem key={equipment.id} value={equipment.id}>
                    {equipment.type} {equipment.brand && `- ${equipment.brand}`} {equipment.model && `(${equipment.model})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="technician">Técnico *</Label>
            <Select value={formData.technician_id} onValueChange={(value) => setFormData({ ...formData, technician_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um técnico" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((technician) => (
                  <SelectItem key={technician.id} value={technician.id}>
                    {technician.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="problem_description">Descrição do Problema *</Label>
            <Textarea
              id="problem_description"
              value={formData.problem_description}
              onChange={(e) => setFormData({ ...formData, problem_description: e.target.value })}
              placeholder="Descreva o problema apresentado pelo equipamento"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Valor (R$)</Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !formData.client_id || !formData.equipment_id || !formData.technician_id}>
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}