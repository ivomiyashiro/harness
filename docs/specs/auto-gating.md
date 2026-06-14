feature: auto-gating
summary: Reducir la interacción humana del pipeline harness a tres zonas necesarias (intención, aprobación irreversible, fallo), automatizando los boundaries de fase rutinarios con un patrón "auto-proceder + objeción".

note: Esta feature edita archivos de prompt/skill (.md). No existe framework de tests para instrucciones en prosa; los ACs se verifican por inspección humana de los skills editados → tag `manual`. Exemplar de formato: los SKILL.md existentes.

FR-1: Documentar en CLAUDE.md el criterio único de gate humano (3 categorías) y el mecanismo "auto-proceder + objeción" como patrón reusable.
FR-2: skills/write-plan deja de bloquear con la aprobación del plan: resume el plan y procede a implement en el mismo turno. El solapamiento de globs con otra feature activa se señala fuerte en el resumen, sin bloquear.
FR-3: skills/spec auto-resuelve los tags y los exemplars (vía explorer / criterio baked-in) sin preguntar al usuario; la aprobación FINAL del spec se mantiene como gate.
FR-4: skills/judge auto-arregla los hallazgos confirmados por AMBOS jueces (dispatch fixer sin preguntar), re-juzga, y solo sube al humano si no converge. Hallazgos de un solo juez se auto-descartan y se loguean. Tope de convergencia: 2 ciclos de re-judge, luego sube como fallo.
FR-5: Los gates que se mantienen quedan explícitos como tales en sus skills: spec-approval, visual-mock, manual-test checklist, fallos de implement/boot, routing ambiguo y spec-amend de iterate, decisión final de merge. brainstorm queda sin cambios.
FR-6: El spec es la ÚNICA fuente de verdad y el judge SIEMPRE juzga contra el spec vigente. Cuando iterate enmienda el spec, la enmienda se aplica IN-PLACE sobre docs/specs/<feature>.md (no se crea un spec paralelo ni quedan ACs obsoletos contradictorios). El dispatch del judge/fixer recibe la ruta del spec vigente; si un AC fue cambiado en la iteración, el juez no puede "arreglar" el código de vuelta a la forma original.

AC-1 [manual]: Given CLAUDE.md del harness, When un lector busca la política de interacción humana, Then encuentra el criterio de 3 categorías (intención / aprobación irreversible / fallo) y la definición del mecanismo "auto-proceder + objeción" (resumen + continuar mismo turno + reversible vía git/re-plan).

AC-2 [manual]: Given skills/write-plan/SKILL.md, When se lee la fase de salida, Then ya NO instruye pedir aprobación bloqueante del plan, y SÍ instruye: resumir tareas+globs, declarar "procedo salvo que me detengas" y cargar el skill implement en el mismo turno.

AC-3 [manual]: Given skills/write-plan/SKILL.md, When el plan toca globs de otra feature activa, Then la instrucción es señalar el solapamiento de forma destacada dentro del resumen de auto-proceder, sin convertirlo en gate bloqueante.

AC-4 [manual]: Given skills/spec/SKILL.md, When se leen las secciones de tags y exemplars, Then instruyen auto-resolver (criterio baked-in + dispatch explorer) sin preguntar al usuario, mientras que la aprobación final del spec permanece como gate explícito.

AC-5 [manual]: Given skills/judge/SKILL.md, When ambos jueces confirman un hallazgo, Then la instrucción es despachar el fixer automáticamente (sin gate de aprobación), re-juzgar, y subir al humano solo si tras 2 ciclos no converge.

AC-6 [manual]: Given skills/judge/SKILL.md, When solo un juez reporta un hallazgo, Then la instrucción es auto-descartarlo y loguearlo (no subirlo al humano como decisión).

AC-7 [manual]: Given los skills tocados (write-plan, spec, judge) y CLAUDE.md, When se revisan los gates que debían mantenerse (spec-approval, visual, manual-test, fallos, iterate-routing/spec-amend, merge final), Then siguen presentes y descritos como gates humanos; brainstorm permanece sin cambios.

AC-8 [manual]: Given skills/iterate/SKILL.md, When la feedback es spec-level y se enmienda el spec, Then la instrucción es editar IN-PLACE docs/specs/<feature>.md (reemplazando/actualizando los ACs afectados, sin dejar ACs obsoletos contradictorios) de modo que quede un único spec vigente.

AC-9 [manual]: Given skills/judge/SKILL.md, When se despacha a judge-a/judge-b/fixer tras una iteración, Then la instrucción es pasarles la ruta del spec VIGENTE como fuente de verdad, y un hallazgo que contradiga un AC ya enmendado NO debe revertir el código a la forma original.

pattern: skills/judge/SKILL.md, skills/spec/SKILL.md, skills/write-plan/SKILL.md (mismo estilo de SKILL.md existente)
