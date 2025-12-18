using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ProyectoPrototipoSistemaWeb.Data;

[Table("Medico")]
public partial class Medico
{
    [Key]
    [Column("medicoId")]
    public int MedicoId { get; set; }

    [Column("medicoCedula")]
    [StringLength(20)]
    [Unicode(false)]
    public string? MedicoCedula { get; set; }

    [Column("medicoNombre")]
    [StringLength(30)]
    [Unicode(false)]
    public string? MedicoNombre { get; set; }

    [Column("medicoApellido")]
    [StringLength(30)]
    [Unicode(false)]
    public string? MedicoApellido { get; set; }

    [Column("medicoEmail")]
    [StringLength(40)]
    [Unicode(false)]
    public string? MedicoEmail { get; set; }

    [Column("medicoTelefono")]
    [StringLength(20)]
    [Unicode(false)]
    public string? MedicoTelefono { get; set; }

    [Column("medicoPassword")]
    [StringLength(200)]
    [Unicode(false)]
    public string? MedicoPassword { get; set; }
}
