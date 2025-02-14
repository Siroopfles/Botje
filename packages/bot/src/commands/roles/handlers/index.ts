import { InitHandler } from './initHandler.js';
import { SyncHandler } from './syncHandler.js';
import { ListHandler } from './listHandler.js';
import { CreateHandler } from './createHandler.js';
import { EditHandler } from './editHandler.js';
import { DeleteHandler } from './deleteHandler.js';
import { AssignHandler } from './assignHandler.js';
import { RoleHandlers } from '../types.js';

// Create a single instance of each handler
const handlers: RoleHandlers = {
    init: new InitHandler(),
    sync: new SyncHandler(),
    list: new ListHandler(),
    create: new CreateHandler(),
    edit: new EditHandler(),
    delete: new DeleteHandler(),
    assign: new AssignHandler()
};

// Export as a single object to ensure handlers are initialized only once
export { handlers };