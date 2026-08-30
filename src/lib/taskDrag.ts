export const TASK_DRAG_TYPE = 'application/x-taffk-task-id';

export function setDraggedTask(dataTransfer: DataTransfer, taskId: string) {
  dataTransfer.setData(TASK_DRAG_TYPE, taskId);
  dataTransfer.setData('text/plain', taskId);
  dataTransfer.effectAllowed = 'move';
}

export function isTaskDrag(dataTransfer: DataTransfer) {
  return dataTransfer.types.includes(TASK_DRAG_TYPE);
}

export function getDraggedTaskId(dataTransfer: DataTransfer) {
  return dataTransfer.getData(TASK_DRAG_TYPE);
}
