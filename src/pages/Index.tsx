import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Users, BarChart3, Shield, CheckCircle, Smartphone } from "lucide-react";
import type { User } from '@supabase/supabase-js';

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  const features = [
    {
      icon: <Wrench className="w-8 h-8 text-primary" />,
      title: "Gestão de OS",
      description: "Crie e gerencie ordens de serviço de forma simples e eficiente"
    },
    {
      icon: <Users className="w-8 h-8 text-secondary" />,
      title: "Clientes",
      description: "Cadastre e organize informações de seus clientes"
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-accent" />,
      title: "Relatórios",
      description: "Acompanhe seu faturamento e performance"
    },
    {
      icon: <Shield className="w-8 h-8 text-primary" />,
      title: "Seguro",
      description: "Seus dados protegidos com autenticação segura"
    },
    {
      icon: <CheckCircle className="w-8 h-8 text-secondary" />,
      title: "Assinatura Digital",
      description: "Coleta de assinaturas digitais e geração de PDF"
    },
    {
      icon: <Smartphone className="w-8 h-8 text-accent" />,
      title: "Mobile First",
      description: "Interface otimizada para dispositivos móveis"
    }
  ];

  return (
    <div className="min-h-screen gradient-bg">
      {/* Hero Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-8">
            <div className="p-4 rounded-full bg-primary/10 shadow-primary">
              <Wrench className="w-16 h-16 text-primary" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-primary mb-6">
            Ordem Express
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Sistema completo de gestão para técnicos autônomos e assistências técnicas
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleGetStarted}
              className="gradient-primary shadow-primary text-lg px-8 py-3"
            >
              {user ? 'Ir para Dashboard' : 'Começar Agora'}
            </Button>
            
            {!user && (
              <Button
                variant="outline"
                onClick={() => navigate('/auth')}
                className="text-lg px-8 py-3"
              >
                Fazer Login
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
              Funcionalidades Principais
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tudo que você precisa para gerenciar sua assistência técnica em um só lugar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow border-0">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      {feature.icon}
                    </div>
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Card className="shadow-xl gradient-primary border-0">
            <CardHeader className="text-center py-12">
              <CardTitle className="text-3xl md:text-4xl font-bold text-white mb-4">
                Pronto para começar?
              </CardTitle>
              <CardDescription className="text-xl text-white/90 mb-8">
                Cadastre-se gratuitamente e comece a organizar sua assistência técnica hoje mesmo
              </CardDescription>
              <Button
                onClick={handleGetStarted}
                variant="secondary"
                className="text-lg px-8 py-3 shadow-lg"
              >
                {user ? 'Acessar Dashboard' : 'Criar Conta Grátis'}
              </Button>
            </CardHeader>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Index;
