// TODO: Implement edit task page
// - Fetch task by id from /api/tasks/[id]
// - Render TaskForm in "edit" mode pre-filled with task data
// - Render AgentPanel alongside for AI assistance
// - No <form> tags — use controlled inputs + onClick handlers

export default function EditTaskPage({ params }: { params: { id: string } }) {
  return (
    <main>
      <p>TODO: Edit task page for {params.id}</p>
    </main>
  );
}
