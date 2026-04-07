function App() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-8">
      <section className="card w-full max-w-2xl bg-base-100 shadow-xl">
        <div className="card-body">
          <p className="text-sm uppercase tracking-[0.2em] text-primary">
            Cinema Booking
          </p>
          <h1 className="text-3xl font-bold">Frontend Scaffold Ready</h1>
          <p className="text-base-content/70">
            Vite, Tailwind, daisyUI, Router, TanStack Query, Zustand, React Hook
            Form, Zod, toast, and Axios are installed.
          </p>
          <div className="card-actions justify-end">
            <button className="btn btn-primary">Continue Setup</button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
