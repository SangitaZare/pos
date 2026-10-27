using Microsoft.AspNetCore.SignalR;

namespace PosApi.Hubs;

public class PosHub : Hub
{
    // Clients only listen. The server pushes events from the controllers.
}