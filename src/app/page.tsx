import { Button } from "~/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Calendar, Users, Clock, Shield, Smartphone, BarChart3 } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">MediCare Pro</span>
          </div>
          <div className="space-x-4">
            <Link href="/login">
              <Button variant="ghost">Iniciar Sesión</Button>
            </Link>
            <Link href="/register">
              <Button>Registrarse</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Gestiona tu consulta médica de forma <span className="text-blue-600">inteligente</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Plataforma completa para doctores que permite gestionar pacientes, agendar citas y optimizar el tiempo de
            consulta con herramientas profesionales.
          </p>
          <div className="space-x-4">
            <Link href="/register">
              <Button size="lg" className="px-8 py-3">
                Comenzar Gratis
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="px-8 py-3">
              Ver Demo
            </Button>
            <Link href="/doctor/1">
              <Button variant="secondary" size="lg" className="px-8 py-3">
                Ver Perfil de Doctor
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Todo lo que necesitas para tu consulta</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>Gestión de Pacientes</CardTitle>
                <CardDescription>Registra y organiza la información de tus pacientes de forma segura</CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Calendar className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <CardTitle>Agendamiento Inteligente</CardTitle>
                <CardDescription>Sistema de citas automático con recordatorios y confirmaciones</CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <BarChart3 className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                <CardTitle>Reportes y Analytics</CardTitle>
                <CardDescription>Analiza el rendimiento de tu consulta con reportes detallados</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold mb-6">Optimiza tu tiempo y mejora la atención</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Clock className="w-6 h-6 text-blue-600 mt-1" />
                  <div>
                    <h4 className="font-semibold">Ahorra tiempo</h4>
                    <p className="text-gray-600">Automatiza tareas administrativas y enfócate en tus pacientes</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Shield className="w-6 h-6 text-green-600 mt-1" />
                  <div>
                    <h4 className="font-semibold">Datos seguros</h4>
                    <p className="text-gray-600">Cumplimiento total con normativas de privacidad médica</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Smartphone className="w-6 h-6 text-purple-600 mt-1" />
                  <div>
                    <h4 className="font-semibold">Acceso móvil</h4>
                    <p className="text-gray-600">Gestiona tu consulta desde cualquier dispositivo</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <img src="/placeholder.svg?height=300&width=400" alt="Dashboard preview" className="w-full rounded-lg" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-blue-600 text-white">
        <div className="container mx-auto text-center">
          <h3 className="text-3xl font-bold mb-4">¿Listo para modernizar tu consulta?</h3>
          <p className="text-xl mb-8 opacity-90">Únete a cientos de doctores que ya confían en MediCare Pro</p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="px-8 py-3">
              Comenzar Prueba Gratuita
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-4">
        <div className="container mx-auto text-center">
          <p>&copy; 2024 MediCare Pro. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
