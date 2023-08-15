import {pst} from './pstType';
import {usr} from './usrType';
export type ntf = {
    _id ?: string | undefined,
    post?: pst | undefined,
    user?: usr | undefined,
    emitterId: string,
    notificationType: string,
    postDescription?: string | undefined,
    postId?: string | undefined,
    timestamp: number,
    seen : boolean,
    archived : boolean
}