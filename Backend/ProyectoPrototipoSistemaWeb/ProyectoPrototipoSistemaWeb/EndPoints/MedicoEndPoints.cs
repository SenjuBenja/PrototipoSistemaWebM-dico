using Microsoft.EntityFrameworkCore;
using ProyectoPrototipoSistemaWeb.Data;

namespace ProyectoPrototipoSistemaWeb.Endpoints
{
    public static class MedicosEndpoints
    {
        public static RouteGroupBuilder MapMedicos(this RouteGroupBuilder group)
        {
            // ============================
            // GET /api/medicos
            // ============================
            group.MapGet("/", async (ClinicaContext db) =>
                await db.Medicos.AsNoTracking().ToListAsync());

            // ============================
            // GET /api/medicos/{id}
            // ============================
            group.MapGet("/{id}", async (string id, ClinicaContext db) =>
            {
                var key = db.Model.FindEntityType(typeof(Medico))!
                                  .FindPrimaryKey()!
                                  .Properties[0].Name;

                var e = await db.Medicos
                    .FirstOrDefaultAsync(x =>
                        EF.Property<object>(x, key)!.ToString() == id);

                return e is null ? Results.NotFound() : Results.Ok(e);
            });


            // ============================================================
            // NUEVO: GET /api/medicos/by-cedula/{cedula}
            // Para recuperar un médico usando la cédula (para forgot password)
            // ============================================================
            group.MapGet("/by-cedula/{cedula}", async (string cedula, ClinicaContext db) =>
            {
                var medico = await db.Medicos
                    .AsNoTracking()
                    .FirstOrDefaultAsync(m => m.MedicoCedula == cedula);

                return medico is null
                    ? Results.NotFound(new { message = "No se encontró médico con esa cédula." })
                    : Results.Ok(medico);
            });


            // ============================
            // POST /api/medicos
            // ============================
            group.MapPost("/", async (Medico dto, ClinicaContext db) =>
            {
                db.Medicos.Add(dto);
                await db.SaveChangesAsync();

                var key = db.Model.FindEntityType(typeof(Medico))!
                                  .FindPrimaryKey()!
                                  .Properties[0].Name;

                var idVal = dto.GetType().GetProperty(key)!.GetValue(dto)?.ToString();

                return Results.Created($"/api/medicos/{idVal}", dto);
            });


            // ============================
            // PUT /api/medicos/{id}
            // ============================
            group.MapPut("/{id}", async (string id, Medico input, ClinicaContext db) =>
            {
                var key = db.Model.FindEntityType(typeof(Medico))!
                                  .FindPrimaryKey()!
                                  .Properties[0].Name;

                var e = await db.Medicos
                    .FirstOrDefaultAsync(x =>
                        EF.Property<object>(x, key)!.ToString() == id);

                if (e is null)
                    return Results.NotFound();

                var pk = e.GetType().GetProperty(key)!.GetValue(e);

                // Sobrescribe todos los valores
                db.Entry(e).CurrentValues.SetValues(input);

                // Restauramos la PK para no romper la entidad
                e.GetType().GetProperty(key)!.SetValue(e, pk);

                await db.SaveChangesAsync();
                return Results.NoContent();
            });


            // ============================
            // DELETE /api/medicos/{id}
            // ============================
            group.MapDelete("/{id}", async (string id, ClinicaContext db) =>
            {
                var key = db.Model.FindEntityType(typeof(Medico))!
                                  .FindPrimaryKey()!
                                  .Properties[0].Name;

                var e = await db.Medicos
                    .FirstOrDefaultAsync(x =>
                        EF.Property<object>(x, key)!.ToString() == id);

                if (e is null)
                    return Results.NotFound();

                db.Medicos.Remove(e);
                await db.SaveChangesAsync();
                return Results.NoContent();
            });

            return group;
        }
    }
}
