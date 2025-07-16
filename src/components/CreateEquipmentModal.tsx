import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus } from "lucide-react";

interface Client {
  id: string;
  name: string;
}

interface CreateEquipmentModalProps {
  onEquipmentCreated?: () => void;
}

export function CreateEquipmentModal({ onEquipmentCreated }: CreateEquipmentModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [formData, setFormData] = useState({
    type: "",
    brand: "",
    model: "",
    serial_number: "",
    observations: "",
    client_id: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadClients();
    }
  }, [open]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from('equipments')
        .insert([
          {
            ...formData,
            user_id: user.id
          }
        ]);

      if (error) throw error;

      toast({
        title: "Equipamento criado com sucesso!",
        description: "O equipamento foi adicionado ao sistema.",
      });

      setFormData({ type: "", brand: "", model: "", serial_number: "", observations: "", client_id: "" });
      setOpen(false);
      onEquipmentCreated?.();
    } catch (error) {
      console.error('Error creating equipment:', error);
      toast({
        title: "Erro ao criar equipamento",
        description: "Não foi possível criar o equipamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="w-full h-full cursor-pointer">
          <div className="mx-auto w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
            <Package className="w-6 h-6 text-accent" />
          </div>
          <h3 className="text-lg font-medium">Equipamentos</h3>
          <p className="text-sm text-muted-foreground text-center">
            Gerenciar equipamentos
          </p>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>Novo Equipamento</span>
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client">Cliente *</Label>
            <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
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
            {clients.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum cliente cadastrado. Cadastre um cliente primeiro.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Tipo *</Label>
            <Input
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              placeholder="Ex: Notebook, Celular, Impressora"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand">Marca</Label>
            <Input
              id="brand"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Modelo</Label>
            <Input
              id="model"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="serial_number">Número de Série</Label>
            <Input
              id="serial_number"
              value={formData.serial_number}
              onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="observations">Observações</Label>
            <Textarea
              id="observations"
              value={formData.observations}
              onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !formData.client_id}>
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}