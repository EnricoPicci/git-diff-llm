export type MessageToClient = {
    id?: string;
    type: string;
    data: any;
}

export type MessageWriter = {
    write: (msg: MessageToClient) => void;
}

export const DefaultMessageWriter: MessageWriter = {
    write: (msg: MessageToClient) => {
        console.log(`Message to client: ${JSON.stringify(msg)}`);
    }
}

export function newInfoMessage(data: any): MessageToClient {
    return {
        type: 'info',
        data
    }
}

export function newErrorMessage(data: any): MessageToClient {
    return {
        type: 'error',
        data
    }
}

export function newWarningMessage(data: any): MessageToClient {
    return {
        type: 'warning',
        data
    }
}

