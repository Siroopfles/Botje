import { CreateHandler } from './createHandler.js';
import { ListHandler } from './listHandler.js';
import { EditHandler } from './editHandler.js';
import { DeleteHandler } from './deleteHandler.js';
import { CompleteHandler } from './completeHandler.js';
import { AssignHandler } from './assignHandler.js';
import { TaskHandlers } from '../types.js';

const handlers: TaskHandlers = {
    create: new CreateHandler(),
    list: new ListHandler(),
    edit: new EditHandler(),
    delete: new DeleteHandler(),
    complete: new CompleteHandler(),
    assign: new AssignHandler()
};

// Export as a single object to ensure handlers are initialized only once
export { handlers };