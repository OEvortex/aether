export interface RumApp {
    id: string;
    env: string;
    version: string;
    type: 'cli' | 'extension';
    channel?: string;
}
export interface RumUser {
    id: string;
}
export interface RumSession {
    id: string;
}
export interface RumView {
    id: string;
    name: string;
}
export interface RumOS {
    type?: string;
    version?: string;
    container?: string;
    container_version?: string;
}
export interface RumDevice {
    id?: string;
    name?: string;
    type?: string;
    brand?: string;
    model?: string;
}
export interface RumEvent {
    timestamp?: number;
    event_type?: 'view' | 'action' | 'exception' | 'resource';
    type: string;
    name: string;
    snapshots?: string;
    properties?: Record<string, unknown>;
}
export interface RumViewEvent extends RumEvent {
    view_type?: string;
    time_spent?: number;
}
export interface RumActionEvent extends RumEvent {
    target_name?: string;
    duration?: number;
    method_info?: string;
}
export interface RumExceptionEvent extends RumEvent {
    source?: string;
    file?: string;
    subtype?: string;
    message?: string;
    stack?: string;
    caused_by?: string;
    line?: number;
    column?: number;
    thread_id?: string;
    binary_images?: string;
}
export interface RumResourceEvent extends RumEvent {
    method?: string;
    status_code?: string;
    message?: string;
    url?: string;
    provider_type?: string;
    trace_id?: string;
    success?: number;
    duration?: number;
    size?: number;
    connect_duration?: number;
    ssl_duration?: number;
    dns_duration?: number;
    redirect_duration?: number;
    first_byte_duration?: number;
    download_duration?: number;
    timing_data?: string;
    trace_data?: string;
}
export interface RumPayload {
    app: RumApp;
    user: RumUser;
    session: RumSession;
    view: RumView;
    os?: RumOS;
    device?: RumDevice;
    events: RumEvent[];
    properties?: Record<string, unknown>;
    _v: string;
}
