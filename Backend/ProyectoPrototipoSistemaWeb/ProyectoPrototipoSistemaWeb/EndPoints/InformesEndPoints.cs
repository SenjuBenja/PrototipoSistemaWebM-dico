using Microsoft.EntityFrameworkCore;
using ProyectoPrototipoSistemaWeb.Data;

namespace ProyectoPrototipoSistemaWeb.Endpoints
{
    public static class InformesEndpoints
    {
        public static RouteGroupBuilder MapInformes(this RouteGroupBuilder group)
        {
            // ========== CRUD ==========
            group.MapGet("/", async (ClinicaContext db) =>
                await db.Set<Informe>().Include(i => i.Cita)
                                       .ThenInclude(c => c.Paciente)
                                       .AsNoTracking()
                                       .ToListAsync());

            group.MapGet("/{id}", async (string id, ClinicaContext db) =>
            {
                var key = db.Model.FindEntityType(typeof(Informe))!.FindPrimaryKey()!.Properties[0].Name;
                var entity = await db.Set<Informe>()
                    .Include(i => i.Cita)
                    .ThenInclude(c => c.Paciente)
                    .FirstOrDefaultAsync(e => EF.Property<object>(e, key)!.ToString() == id);
                return entity is null ? Results.NotFound() : Results.Ok(entity);
            });

            group.MapPost("/", async (Informe dto, ClinicaContext db) =>
            {
                db.Set<Informe>().Add(dto);
                await db.SaveChangesAsync();

                var key = db.Model.FindEntityType(typeof(Informe))!.FindPrimaryKey()!.Properties[0].Name;
                var idVal = dto.GetType().GetProperty(key)!.GetValue(dto)?.ToString();
                return Results.Created($"/api/informes/{idVal}", dto);
            });

            group.MapPut("/{id}", async (string id, Informe input, ClinicaContext db) =>
            {
                var key = db.Model.FindEntityType(typeof(Informe))!.FindPrimaryKey()!.Properties[0].Name;
                var entity = await db.Set<Informe>()
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
                var key = db.Model.FindEntityType(typeof(Informe))!.FindPrimaryKey()!.Properties[0].Name;
                var entity = await db.Set<Informe>()
                    .FirstOrDefaultAsync(e => EF.Property<object>(e, key)!.ToString() == id);
                if (entity is null) return Results.NotFound();
                db.Set<Informe>().Remove(entity);
                await db.SaveChangesAsync();
                return Results.NoContent();
            });

            // ========== BÚSQUEDAS ==========
            group.MapGet("/search", async (
                string? paciente,
                DateTime? fecha,
                ClinicaContext db) =>
            {
                var qry = db.Set<Informe>()
                            .Include(i => i.Cita)
                            .ThenInclude(c => c.Paciente)
                            .AsNoTracking()
                            .AsQueryable();

                if (!string.IsNullOrWhiteSpace(paciente))
                {
                    var t = paciente.Trim();
                    qry = qry.Where(i =>
                        i.Cita.Paciente.PacienteCedula.Contains(t) ||
                        i.Cita.Paciente.PacienteNombre.Contains(t) ||
                        i.Cita.Paciente.PacienteApellido.Contains(t));
                }

                if (fecha.HasValue)
                    qry = qry.Where(i => i.InformeFecha.Date == fecha.Value.Date);

                return await qry.OrderByDescending(i => i.InformeFecha)
                                .Take(100)
                                .ToListAsync();
            });

            return group;
        }
    }
}
