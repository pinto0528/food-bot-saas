import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-bold">FoodBot</span>
          <a href="/auth/login">
            <Button variant="outline">Iniciar Sesion</Button>
          </a>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Pedidos por WhatsApp
            <br />
            <span className="text-muted-foreground">para tu restaurante</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Tus clientes piden con lenguaje natural via WhatsApp. Tu recibes
            los pedidos al instante. Sin apps, sin codigos QR, sin complicaciones.
          </p>
          <div className="flex gap-4 justify-center">
            <a href="/demo">
              <Button size="lg" variant="outline">Probar Bot</Button>
            </a>
            <a href="/auth/login">
              <Button size="lg">Acceder al Dashboard</Button>
            </a>
          </div>
        </section>

        <section className="border-t py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-3xl mb-3">💬</div>
                <h3 className="font-semibold mb-2">Lenguaje Natural</h3>
                <p className="text-sm text-muted-foreground">
                  El cliente escribe como habla. El bot entiende "dos hamburguesas sin cebolla".
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-3">📱</div>
                <h3 className="font-semibold mb-2">Todo por WhatsApp</h3>
                <p className="text-sm text-muted-foreground">
                  Recibi los pedidos en tu propio WhatsApp. Sin necesidad de pantallas ni tablets.
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-3">⚡</div>
                <h3 className="font-semibold mb-2">Sin configuracion</h3>
                <p className="text-sm text-muted-foreground">
                  Conecta tu numero de WhatsApp y en minutos estas recibiendo pedidos.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>FoodBot &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}
