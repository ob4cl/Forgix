'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [completed, setCompleted] = useState(0);
  return (
    <main>
      <p className="eyebrow">Next.js + local shadcn/ui · {{projectName}}</p>
      <h1>Make room for your next idea.</h1>
      <p>A tiny focus tracker: finish a task, log it, and keep moving. Replace this card with your own work.</p>
      <p role="status" aria-live="polite">Tasks completed: {completed}</p>
      <div className="actions">
        <Button type="button" onClick={() => setCompleted(completed + 1)}>Complete a task</Button>
        <Button type="button" variant="outline" onClick={() => setCompleted(0)}>Reset</Button>
      </div>
    </main>
  );
}
