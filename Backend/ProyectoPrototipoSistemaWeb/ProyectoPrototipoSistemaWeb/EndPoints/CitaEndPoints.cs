using Microsoft.EntityFrameworkCore;
using ProyectoPrototipoSistemaWeb.Data;

namespace ProyectoPrototipoSistemaWeb.Endpoints
{
    // DTOs para el front
    public record CrearCitaPorCedulaRequest(
        string PacienteCedula,
        DateTime CitaFecha,
        string CitaMotivo,
        string? CitaModalidad
    );

    public record CitaResumenDto(
        int CitaId,
        DateTime CitaFecha,
        string? CitaModalidad,
        int PacienteId,
        string PacienteCedula,
        string PacienteNombre,
        string PacienteApellido
    );

    public static class CitasEndpoints
    {
        public static RouteGroupBuilder MapCitas(this RouteGroupBuilder group)
        {
            // ===== CRUD estándar =====
            group.MapGet("/", async (ClinicaContext db) =>
                await db.Set<Citum>()
                        .AsNoTracking()
                        .Include(c => c.Paciente)
                        .ToListAsync());

            group.MapGet("/{id}", async (string id, ClinicaContext db) =>
            {
                var key = db.Model.FindEntityType(typeof(Citum))!.FindPrimaryKey()!.Properties[0].Name;
                var entity = await db.Set<Citum>()
                    .Include(c => c.Paciente)
                    .FirstOrDefaultAsync(e => EF.Property<object>(e, key)!.ToString() == id);
                return entity is null ? Results.NotFound() : Results.Ok(entity);
            });

            // (Sin validación estricta de modalidad)
            group.MapPost("/", async (Citum dto, ClinicaContext db) =>
            {
                db.Set<Citum>().Add(dto);
                await db.SaveChangesAsync();

                var key = db.Model.FindEntityType(typeof(Citum))!.FindPrimaryKey()!.Properties[0].Name;
                var idVal = dto.GetType().GetProperty(key)!.GetValue(dto)?.ToString();
                return Results.Created($"/api/citas/{idVal}", dto);
            });

            group.MapPut("/{id}", async (string id, Citum input, ClinicaContext db) =>
            {
                var key = db.Model.FindEntityType(typeof(Citum))!.FindPrimaryKey()!.Properties[0].Name;
                var entity = await db.Set<Citum>()
                    .FirstOrDefaultAsync(e => EF.Property<object>(e, key)!.ToString() == id);
                if (entity is null) return Results.NotFound();

                var pk = entity.GetType().GetProperty(key)!.GetValue(entity);
                db.Entry(entity).CurrentValues.SetValues(input);
                entity.GetType().GetProperty(key)!.SetValue(entity, pk);
                await db.SaveChangesAsync();
                return Results.NoContent();
            });

            group.MapDelete("/{id}", async (string id, ClinicaContext db) =>
            {
                var key = db.Model.FindEntityType(typeof(Citum))!.FindPrimaryKey()!.Properties[0].Name;
                var entity = await db.Set<Citum>()
                    .FirstOrDefaultAsync(e => EF.Property<object>(e, key)!.ToString() == id);
                if (entity is null) return Results.NotFound();
                db.Set<Citum>().Remove(entity);
                await db.SaveChangesAsync();
                return Results.NoContent();
            });

            // ===== Búsquedas para UI =====
            // /api/citas/search?paciente=andrea&fecha=2025-11-25&desde=2025-11-01&hasta=2025-11-30
            group.MapGet("/search", async (
                string? paciente,
                DateTime? fecha,
                DateTime? desde,
                DateTime? hasta,
                ClinicaContext db) =>
            {
                var qry = db.Set<Citum>()
                            .Include(c => c.Paciente)
                            .AsNoTracking()
                            .AsQueryable();

                if (!string.IsNullOrWhiteSpace(paciente))
                {
                    var t = paciente.Trim();
                    qry = qry.Where(c =>
                        c.Paciente.PacienteCedula.Contains(t) ||
                        c.Paciente.PacienteNombre.Contains(t) ||
                        c.Paciente.PacienteApellido.Contains(t));
                }

                if (fecha.HasValue)
                    qry = qry.Where(c => c.CitaFecha.Date == fecha.Value.Date);

                if (desde.HasValue)
                    qry = qry.Where(c => c.CitaFecha >= desde.Value.Date);

                if (hasta.HasValue)
                    qry = qry.Where(c => c.CitaFecha < hasta.Value.Date.AddDays(1));

                return await qry.OrderByDescending(c => c.CitaFecha)
                                .Take(100)
                                .ToListAsync();
            });

            // ===== Crear cita por CÉDULA (sin pedir pacienteId al front) =====
            // POST /api/citas/crear-por-cedula
            group.MapPost("/crear-por-cedula", async (
                CrearCitaPorCedulaRequest req,
                ClinicaContext db) =>
            {
                var paciente = await db.Pacientes
                    .FirstOrDefaultAsync(p => p.PacienteCedula == req.PacienteCedula);

                if (paciente is null)
                    return Results.NotFound($"No existe paciente con cédula {req.PacienteCedula}");

                var cita = new Citum
                {
                    PacienteId = (int)typeof(Paciente).GetProperty(
                        db.Model.FindEntityType(typeof(Paciente))!
                                .FindPrimaryKey()!.Properties[0].Name
                    )!.GetValue(paciente)!,
                    CitaFecha = req.CitaFecha,
                    CitaMotivo = req.CitaMotivo,
                    CitaModalidad = req.CitaModalidad // puede ser null o cualquier texto
                };

                db.Set<Citum>().Add(cita);
                await db.SaveChangesAsync();

                return Results.Created($"/api/citas/{cita.CitaId}", new
                {
                    cita.CitaId,
                    cita.CitaFecha,
                    cita.CitaModalidad,
                    Paciente = new
                    {
                        paciente.PacienteId,
                        paciente.PacienteCedula,
                        paciente.PacienteNombre,
                        paciente.PacienteApellido
                    }
                });
            });

            // ===== Calendario por DÍA =====
            // GET /api/citas/dia?fecha=2025-11-12
            group.MapGet("/dia", async (DateTime fecha, ClinicaContext db) =>
            {
                var ini = fecha.Date;
                var fin = ini.AddDays(1);

                var datos = await db.Set<Citum>()
                    .Include(c => c.Paciente)
                    .Where(c => c.CitaFecha >= ini && c.CitaFecha < fin)
                    .OrderBy(c => c.CitaFecha)
                    .Select(c => new CitaResumenDto(
                        c.CitaId,
                        c.CitaFecha,
                        c.CitaModalidad,
                        c.Paciente.PacienteId,
                        c.Paciente.PacienteCedula,
                        c.Paciente.PacienteNombre,
                        c.Paciente.PacienteApellido
                    ))
                    .AsNoTracking()
                    .ToListAsync();

                return Results.Ok(datos);
            });

            // ===== Calendario por SEMANA =====
            // GET /api/citas/semana?desde=2025-11-10  (cualquier día de la semana; se normaliza a lunes)
            group.MapGet("/semana", async (DateTime desde, ClinicaContext db) =>
            {
                // Normalizamos a lunes
                var delta = ((int)desde.DayOfWeek + 6) % 7; // Lunes=0
                var ini = desde.Date.AddDays(-delta);
                var fin = ini.AddDays(7);

                var datos = await db.Set<Citum>()
                    .Include(c => c.Paciente)
                    .Where(c => c.CitaFecha >= ini && c.CitaFecha < fin)
                    .OrderBy(c => c.CitaFecha)
                    .Select(c => new CitaResumenDto(
                        c.CitaId,
                        c.CitaFecha,
                        c.CitaModalidad,
                        c.Paciente.PacienteId,
                        c.Paciente.PacienteCedula,
                        c.Paciente.PacienteNombre,
                        c.Paciente.PacienteApellido
                    ))
                    .AsNoTracking()
                    .ToListAsync();

                return Results.Ok(new { semanaInicio = ini, semanaFin = fin.AddDays(-1), citas = datos });
            });

            return group;
        }
    }
}
