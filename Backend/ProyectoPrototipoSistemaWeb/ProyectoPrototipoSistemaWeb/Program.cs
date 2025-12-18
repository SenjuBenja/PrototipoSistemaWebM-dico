using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;
using ProyectoPrototipoSistemaWeb.Data;
using ProyectoPrototipoSistemaWeb.Endpoints; // <- para registrar los endpoints

var builder = WebApplication.CreateBuilder(args);

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// DbContext (usa tu cadena "Default" en appsettings.json)
builder.Services.AddDbContext<ClinicaContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

// Evitar ciclos en serialización
builder.Services.ConfigureHttpJsonOptions(opt =>
{
    opt.SerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});

var allowedOrigins = new[]
{
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "https://localhost:5500",
    "https://127.0.0.1:5500"
};
builder.Services.AddCors(o =>
{
    o.AddPolicy("front", p => p
        .WithOrigins(allowedOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()
    );
});

var app = builder.Build();
app.UseCors("front");

// Swagger en desarrollo
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Healthcheck simple
app.MapGet("/", () => Results.Ok(new { ok = true, api = "Clinica.Api" }));

// ====== REGISTRO DE ENDPOINTS ======
var api = app.MapGroup("/api");
api.MapGroup("/auth").MapAuth();
api.MapGroup("/pacientes").MapPacientes();
api.MapGroup("/citas").MapCitas();
api.MapGroup("/informes").MapInformes();
api.MapGroup("/medicos").MapMedicos();
api.MapGroup("/dashboard").MapDashboard();
app.Run();
