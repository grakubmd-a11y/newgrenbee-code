/**
 * packages/config/servicesI18n.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Spanish translations for SERVICES_DATA text fields.
 *
 * ONLY translates user-visible text: name, tagline, description,
 * unitName, unitLabel, includedSpecs, and factor/option labels.
 *
 * Prices, IDs, icons, and numeric fields come from SERVICES_DATA unchanged.
 *
 * Usage — see useTranslatedService() hook in apps/app/hooks/useTranslatedService.ts
 */

interface ServiceTextI18n {
  name:          string;
  tagline:       string;
  description:   string;
  unitName:      string;
  unitLabel:     string;
  includedSpecs: string[];
  /** factorName → { label, options: { [optionLabel_en]: string } } */
  factors: Record<string, {
    label:   string;
    options: Record<string, string>;
  }>;
}

export const SERVICES_I18N_ES: Record<string, ServiceTextI18n> = {

  "house-cleaning": {
    name:        "Limpieza del Hogar",
    tagline:     "Limpieza profesional impecable para un hogar sano y reluciente.",
    description: "Nuestros profesionales certificados usan productos ecológicos para limpiar en profundidad tu hogar. Cada visita incluye aspirado, desempolvado, fregado, eliminación de basura y desinfección de cocinas y baños.",
    unitName:    "habitación extra",
    unitLabel:   "Habitaciones Adicionales (oficina, comedor, sala de juegos…)",
    includedSpecs: [
      "Limpiar y desempolvar todas las superficies accesibles",
      "Aspirar alfombras, tapetes y escaleras",
      "Barrer y desinfectar todos los pisos duros",
      "Cargar lavavajillas o lavar hasta 10 platos",
      "Fregar, desinfectar y pulir inodoros, lavamanos y duchas",
      "Sacar la basura y colocar bolsas nuevas"
    ],
    factors: {
      bedroomCount: {
        label: "Dormitorios",
        options: {
          "Studio":         "Estudio",
          "1 Bedroom":      "1 Dormitorio",
          "2 Bedrooms":     "2 Dormitorios",
          "3 Bedrooms":     "3 Dormitorios",
          "4 Bedrooms":     "4 Dormitorios",
          "5 Bedrooms":     "5 Dormitorios",
          "6+ Bedrooms":    "6+ Dormitorios"
        }
      },
      bathroomCount: {
        label: "Baños",
        options: {
          "1 Bathroom":     "1 Baño",
          "2 Bathrooms":    "2 Baños",
          "3 Bathrooms":    "3 Baños",
          "4 Bathrooms":    "4 Baños",
          "5 Bathrooms":    "5 Baños",
          "6+ Bathrooms":   "6+ Baños"
        }
      },
      cleanType: {
        label: "Tipo de Limpieza",
        options: {
          "Standard Maintenance Clean":         "Limpieza de Mantenimiento Estándar",
          "Deep Structural Clean (+$45)":       "Limpieza Profunda (+$45)",
          "Move-In / Move-Out Clean (+$75)":    "Limpieza de Entrada/Salida (+$75)"
        }
      },
      petFactor: {
        label: "Mascotas en el Hogar",
        options: {
          "No Pets":                                  "Sin Mascotas",
          "Yes, pet hair specialty sweep (+$25)":     "Sí, limpieza especial de pelo de mascota (+$25)"
        }
      },
      extrasAppliances: {
        label: "Limpieza Interior de Electrodomésticos",
        options: {
          "Skip appliance interiors":              "No limpiar interiores",
          "Inside fridge + inside oven (+$40)":   "Interior de nevera + interior de horno (+$40)"
        }
      },
      extrasLinens: {
        label: "Lavandería y Ropa de Cama",
        options: {
          "No laundry or linen service":             "Sin servicio de lavandería",
          "Laundry folding + bed making (+$30)":     "Doblado de ropa + tender camas (+$30)"
        }
      },
      extrasWindows: {
        label: "Limpieza Interior de Ventanas",
        options: {
          "Skip interior windows":                   "Sin limpieza de ventanas",
          "Clean all interior windows (+$20)":       "Limpiar todas las ventanas interiores (+$20)"
        }
      },
      clutterLevel: {
        label: "Nivel de Desorden",
        options: {
          "Tidy — easy access to all surfaces":                          "Ordenado — acceso fácil a superficies",
          "Moderate clutter — some clearing needed (+$15)":              "Desorden moderado — algo de despeje necesario (+$15)",
          "Heavy clutter — significant pre-clean prep (+$30)":           "Mucho desorden — preparación previa significativa (+$30)"
        }
      }
    }
  },

  "tv-installation": {
    name:        "Instalación de TV",
    tagline:     "Montaje seguro y a nivel perfecto con gestión limpia de cables.",
    description: "Montamos tu televisor de forma segura en cualquier superficie con detección profesional de vigas, nivelación de precisión y ocultación de cables. Seguro para niños, mascotas y con el ángulo de visión ideal.",
    unitName:    "TV",
    unitLabel:   "Total de TVs a Instalar",
    includedSpecs: [
      "Detección de vigas y prueba de integridad con detectores digitales",
      "Instalación de soportes de acero con pernos de alta resistencia",
      "Calibración de precisión con nivel de burbuja",
      "Conexión de componentes del sistema (consolas, soundbars, multimedia)",
      "Organización y sujeción de cables HDMI y eléctricos",
      "Verificación de señal HDMI y encendido del sistema"
    ],
    factors: {
      tvSize: {
        label: "Tamaño de Pantalla",
        options: {
          "Up to 43 inches":           "Hasta 43 pulgadas",
          "44 to 65 inches":           "44 a 65 pulgadas",
          "66 to 85 inches (+$25)":    "66 a 85 pulgadas (+$25)",
          "86 inches or larger (+$45)":"86 pulgadas o más (+$45)"
        }
      },
      mountType: {
        label: "Soporte de Montaje",
        options: {
          "I have my own bracket / Flat Fixed Bracket":             "Tengo mi propio soporte / Soporte fijo plano",
          "Tilting Wall Bracket provided by tech (+$20)":           "Soporte inclinable provisto por el técnico (+$20)",
          "Full-Motion Swivel Bracket provided by tech (+$48)":     "Soporte giratorio articulado provisto por el técnico (+$48)"
        }
      },
      wallMaterial: {
        label: "Material de la Pared",
        options: {
          "Standard Drywall / Wood Studs":          "Drywall estándar / Vigas de madera",
          "Concrete, Brick or Masonry (+$30)":      "Concreto, ladrillo o mampostería (+$30)",
          "Metal Studs Stud-Lock system (+$25)":    "Vigas metálicas sistema Stud-Lock (+$25)"
        }
      },
      wireHiding: {
        label: "Gestión de Cables",
        options: {
          "Tidy bundle with velcro wraps":                     "Ordenado con velcro",
          "In-wall routing with discrete outlet plates (+$45)":"Paso por interior de pared con tapas discretas (+$45)"
        }
      },
      soundbarSetup: {
        label: "Configuración de Soundbar / Componentes",
        options: {
          "TV only — no additional components":               "Solo TV — sin componentes adicionales",
          "Connect soundbar, console or media device (+$20)": "Conectar soundbar, consola o dispositivo multimedia (+$20)"
        }
      }
    }
  },

  "lawn-mowing": {
    name:        "Corte de Césped",
    tagline:     "Corte de precisión, detallado y eliminación de residuos verdes.",
    description: "Mantén tu jardín impecable. El servicio incluye corte con cuchilla afilada, delineado a lo largo de cercas y árboles, bordeado de concreto y acabado con soplador.",
    unitName:    "mil pies²",
    unitLabel:   "Área del Césped (aprox. en miles de pies²)",
    includedSpecs: [
      "Corte con cortadoras profesionales de empuje o montadas",
      "Delineado de bordes en jardines, postes y árboles",
      "Bordeado de aceras, entradas y patios",
      "Soplado de recortes de aceras y patios",
      "Embolsado y reciclaje de residuos verdes (eco-compostado)"
    ],
    factors: {
      grassHeight: {
        label: "Nivel de Crecimiento Actual",
        options: {
          "Regular maintained length (under 3 inches)":              "Longitud regular mantenida (menos de 3 pulgadas)",
          "Overgrown yard (3 to 8 inches) (+ $25)":                 "Jardín crecido (3 a 8 pulgadas) (+$25)",
          "Wild brush / Clearing required (8+ inches) (+ $65)":     "Maleza alta / limpieza necesaria (+8 pulgadas) (+$65)"
        }
      },
      baggingClippings: {
        label: "Manejo de Recortes",
        options: {
          "Mulch back into lawn (natural fertilizing)":          "Mulch en el césped (fertilización natural)",
          "Collect and bag for green bin disposal (+$10)":       "Recoger y embolsar para contenedor verde (+$10)"
        }
      },
      edgingService: {
        label: "Bordeado y Poda de Arbustos",
        options: {
          "Mowing only — no extra edging":                       "Solo corte — sin bordeado extra",
          "Hard edge walkways + trim shrubs & hedges (+$20)":    "Bordeado duro + poda de arbustos y setos (+$20)"
        }
      },
      debrisCleanup: {
        label: "Limpieza de Residuos y Hojas",
        options: {
          "No debris removal needed":                            "Sin remoción de residuos",
          "Rake & remove leaves and yard debris (+$35)":         "Rastrillar y retirar hojas y residuos (+$35)"
        }
      },
      weedControl: {
        label: "Control de Maleza",
        options: {
          "No weed removal":                                     "Sin remoción de maleza",
          "Hand-pull weeds from beds & cracks (+$25)":          "Arrancar maleza a mano de camas y grietas (+$25)"
        }
      }
    }
  },

  "furniture-assembly": {
    name:        "Armado de Muebles",
    tagline:     "Armado seguro y sin estrés de muebles de cualquier marca.",
    description: "No te preocupes por los manuales. Armamos sillas, camas, cómodas, escritorios, muebles de patio y flat-packs IKEA de forma rápida y segura con medidas de anclaje anti-vuelco.",
    unitName:    "unidad",
    unitLabel:   "Total de Artículos a Armar",
    includedSpecs: [
      "Clasificación de piezas y verificación de partes con manual",
      "Alineación de juntas con verificación de tensión y torque manual",
      "Nivelación del producto y ajuste de almohadillas de patas",
      "Verificación de seguridad anti-vuelco y soporte de carga",
      "Compresión y apilado de cajas de cartón del envío"
    ],
    factors: {
      furnitureComplexity: {
        label: "Tamaño y Complejidad del Artículo",
        options: {
          "Simple (Chair, Nightstand, Coffee table)":                               "Simple (Silla, mesita de noche, mesa de centro)",
          "Medium (Bed frame, Writing desk, TV console) (+ $25)":                   "Medio (Marco de cama, escritorio, mueble TV) (+$25)",
          "Highly Complex (Wardrobe, Multi-drawer dresser, L-Desk) (+ $50)":        "Muy complejo (Armario, cómoda, escritorio en L) (+$50)"
        }
      },
      furnitureBrand: {
        label: "Marca / Origen del Mueble",
        options: {
          "IKEA flat-pack (instructions provided)":                   "IKEA flat-pack (instrucciones incluidas)",
          "Other flat-pack brand (Amazon, Wayfair, Target...)":       "Otra marca flat-pack (Amazon, Wayfair, Target…)",
          "Custom / no instructions — may take longer (+$20)":        "Personalizado / sin instrucciones — puede tomar más (+$20)"
        }
      },
      wallAnchor: {
        label: "Anclaje Anti-Vuelco a la Pared",
        options: {
          "No wall anchoring needed":                                 "No se necesita anclaje",
          "Anchor heavy items into studs for family safety (+$15)":   "Anclar artículos pesados a vigas por seguridad (+$15)"
        }
      },
      boxHaulAway: {
        label: "Retiro de Embalaje",
        options: {
          "I'll handle the boxes myself":                                         "Yo me encargo de las cajas",
          "Tech compresses + takes all packaging to dumpster (+$15)":            "El técnico comprime y retira todo el embalaje (+$15)"
        }
      }
    }
  },

  "pressure-washing": {
    name:        "Lavado a Presión",
    tagline:     "Limpieza profunda a presión de entradas, terrazas, ladrillos y revestimientos.",
    description: "Elimina años de suciedad, mugre, musgo y moho verde. Ideal para restaurar patios, terrazas, caminos de concreto y fachadas exteriores a un estado impecable.",
    unitName:    "500 pies²",
    unitLabel:   "Área (aprox. en 500 pies²)",
    includedSpecs: [
      "Inspección previa de musgo en mampostería y líneas de pintura frágil",
      "Pre-remojo con detergentes surfactantes para aflojar la suciedad",
      "Lavado uniforme de pisos con limpiadores de superficie rotativos",
      "Detallado a alta presión de juntas y esquinas de concreto",
      "Enjuague de revestimientos, plantas y desagüe de entrada adyacentes"
    ],
    factors: {
      surfaceMaterial: {
        label: "Tipo de Superficie",
        options: {
          "Smooth Concrete or Mortar Patio":                       "Concreto liso o patio de mortero",
          "Delicate Timber Decking / Wooden Siding (+ $25)":       "Terraza de madera delicada / revestimiento (+$25)",
          "Heavy Texture Stone, Brickwork, or Roof Tiling (+ $40)":"Piedra con textura, ladrillos o tejas (+$40)"
        }
      },
      dirtLevel: {
        label: "Condición de la Superficie / Nivel de Manchas",
        options: {
          "Light — seasonal dust and light mildew":                "Ligero — polvo estacional y algo de moho",
          "Moderate — embedded grime, green algae (+$20)":        "Moderado — suciedad incrustada y algas (+$20)",
          "Heavy — deep stains, black mold, years of buildup (+$45)":"Pesado — manchas profundas, moho negro, años de acumulación (+$45)"
        }
      },
      oilTreatment: {
        label: "Pre-Tratamiento de Aceite, Óxido y Manchas",
        options: {
          "Standard dirt & mildew clean — no pre-treatment":    "Limpieza estándar sin pre-tratamiento",
          "Degreaser for machinery oil/rust spots (+$35)":      "Desengrasante para manchas de aceite/óxido (+$35)"
        }
      },
      sealingCoating: {
        label: "Sellado Protector tras el Lavado",
        options: {
          "Wash only — no sealing":                                  "Solo lavado — sin sellado",
          "Apply concrete or wood protective sealant (+$75)":        "Aplicar sellante protector de concreto o madera (+$75)"
        }
      },
      gutteraddon: {
        label: "Limpieza de Canaletas (Add-On)",
        options: {
          "No gutter cleaning":                                      "Sin limpieza de canaletas",
          "Clear gutters and downspouts while on-site (+$45)":       "Limpiar canaletas y bajantes en sitio (+$45)"
        }
      }
    }
  },

  "wall-mounting": {
    name:        "Montaje en Pared",
    tagline:     "Instalación experta de estantes, espejos, cuadros y gabinetes en cualquier pared.",
    description: "Desde estantes flotantes y gabinetes de baño hasta espejos grandes y galerías de arte, montamos cualquier artículo con detección de vigas, nivelación de precisión y herraje resistente al peso declarado.",
    unitName:    "artículo",
    unitLabel:   "Total de Artículos a Montar",
    includedSpecs: [
      "Detección electrónica de vigas y cables antes de cada perforación",
      "Anclajes y herrajes seleccionados según el peso del artículo",
      "Nivelación digital de precisión al milímetro",
      "Perforación guiada con protector anti-polvo",
      "Prueba de carga tras el montaje — testeado al doble de la capacidad declarada",
      "Limpieza y relleno de agujeros de anclajes anteriores (si se solicita)"
    ],
    factors: {
      wallSurface: {
        label: "Material de la Pared",
        options: {
          "Standard Drywall / Wood Studs":       "Drywall estándar / vigas de madera",
          "Tile or Glass Surface (+ $20)":       "Azulejo o superficie de vidrio (+$20)",
          "Concrete, Brick or Masonry (+ $30)":  "Concreto, ladrillo o mampostería (+$30)"
        }
      },
      mountItemType: {
        label: "¿Qué Vas a Montar?",
        options: {
          "Floating shelf or small décor":                      "Estante flotante o décor pequeño",
          "Large mirror or framed artwork":                     "Espejo grande o cuadro enmarcado",
          "Cabinet, towel bar or bathroom fixture":             "Gabinete, toallero o accesorio de baño",
          "Gallery wall (5+ items — coordinated layout) (+$25)":"Pared galería (5+ artículos) (+$25)"
        }
      },
      itemWeight: {
        label: "Clase de Peso del Artículo",
        options: {
          "Light (under 25 lbs) — décor, small shelves":          "Ligero (< 25 lbs) — décor, estantes pequeños",
          "Medium (25–60 lbs) — large mirrors, shelving units (+$15)":"Medio (25–60 lbs) — espejos grandes, estanterías (+$15)",
          "Heavy (60+ lbs) — cabinets, large artwork, safes (+$30)": "Pesado (60+ lbs) — gabinetes, cuadros grandes, cajas fuertes (+$30)"
        }
      },
      holePatchRepair: {
        label: "Relleno de Agujeros Anteriores",
        options: {
          "No patching needed — fresh wall":                    "Sin relleno — pared nueva",
          "Patch & sand old anchor holes before mounting (+$20)":"Rellenar y lijar agujeros de anclajes anteriores (+$20)"
        }
      }
    }
  },

  "vacation-rental-turnover": {
    name:        "Limpieza de Alquiler Vacacional",
    tagline:     "Cambios entre huéspedes listos para recibir — fiables, documentados y puntuales.",
    description: "Limpieza profesional de Airbnb/VRBO coordinada con tu check-in/check-out. Cada cambio incluye documentación fotográfica de antes y después, preparación para el siguiente huésped, desinfección completa, retiro de basura y revisión de suministros.",
    unitName:    "turno",
    unitLabel:   "Turno",
    includedSpecs: [
      "Documentación fotográfica de antes y después para tus registros",
      "Preparación para huéspedes — camas tendidas, toallas, superficies reordenadas",
      "Desinfección completa de cocina y baños",
      "Aspirado, barrido y fregado de todos los pisos",
      "Retiro de basura y reciclaje, bolsas nuevas",
      "Revisión de suministros (jabón, papel, esenciales) para que nunca falte nada"
    ],
    factors: {
      bedrooms: {
        label: "Dormitorios",
        options: {
          "Studio":       "Estudio",
          "1 Bedroom":    "1 Dormitorio",
          "2 Bedrooms":   "2 Dormitorios",
          "3 Bedrooms":   "3 Dormitorios",
          "4 Bedrooms":   "4 Dormitorios",
          "5+ Bedrooms":  "5+ Dormitorios"
        }
      },
      bathrooms: {
        label: "Baños",
        options: {
          "1 Bathroom":   "1 Baño",
          "2 Bathrooms":  "2 Baños",
          "3 Bathrooms":  "3 Baños",
          "4+ Bathrooms": "4+ Baños"
        }
      },
      restock: {
        label: "Reabastecimiento de Amenidades",
        options: {
          "No restocking":                                               "Sin reabastecimiento",
          "Restock guest amenities — soap, paper, coffee (+$20)":        "Reabastecer amenidades (jabón, papel, café) (+$20)"
        }
      },
      laundry: {
        label: "Ropa de Cama y Lavandería",
        options: {
          "No laundry":                                        "Sin lavandería",
          "Wash & fold linens and towels on-site (+$30)":      "Lavar y doblar sábanas y toallas en sitio (+$30)"
        }
      },
      expressTurnover: {
        label: "Velocidad de Turno",
        options: {
          "Standard scheduling":                             "Programación estándar",
          "Express turnover — under 4 hours notice (+$45)":  "Turno exprés — menos de 4 horas de aviso (+$45)"
        }
      }
    }
  }
};
