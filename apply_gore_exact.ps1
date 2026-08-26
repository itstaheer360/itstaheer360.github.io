$path = 'c:\taheer-tech-works\FPS game\deadzone-fps-game\game.js'
$lines = [System.IO.File]::ReadAllLines($path, [System.Text.Encoding]::UTF8)

# 1. Insert explodeHead before _die()
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match '^\s*_die\(\)\s*\{') {
        $explodeMethod = @(
            "  explodeHead(shotDir, hitPoint) {",
            "    if (this.headDestroyed) return;",
            "    this.headDestroyed = true;",
            "",
            "    // 1. Hide the intact head mesh and its facial features",
            "    if (this.head) {",
            "      this.head.visible = false;",
            "    }",
            "",
            "    // 2. Add bloody severed neck stump with meat & vertebrae bone to the body group",
            "    const stumpMat = new THREE.MeshLambertMaterial({ color: 0x5a0000 });",
            "    const boneMat = new THREE.MeshLambertMaterial({ color: 0xd8d0c0 });",
            "    const stump = new THREE.Group();",
            "    ",
            "    // Torn flesh ring",
            "    const meat = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.12, 8), stumpMat);",
            "    meat.position.y = 1.40;",
            "    stump.add(meat);",
            "",
            "    // Severed vertebrae bone in the center",
            "    const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.14, 6), boneMat);",
            "    bone.position.y = 1.42;",
            "    stump.add(bone);",
            "",
            "    this.group.add(stump);",
            "    this.neckStump = stump;",
            "",
            "    // 3. Play wet meaty gore splatter explosion SFX",
            "    playGoreHeadPopSound();",
            "",
            "    // 4. Head position in 3D world space",
            "    const headWorldPos = new THREE.Vector3();",
            "    this.head.getWorldPosition(headWorldPos);",
            "    if (headWorldPos.lengthSq() < 0.1) {",
            "      headWorldPos.copy(this.group.position);",
            "      headWorldPos.y += 1.6;",
            "    }",
            "",
            "    // 5. Spawn flying skull/flesh/brain gibs (blow into pieces)",
            "    spawnGoreGibs(headWorldPos, shotDir || new THREE.Vector3(0, 0, -1));",
            "",
            "    // 6. Spawn massive high-pressure blood fountain & mist",
            "    spawnBloodFountain(headWorldPos, shotDir || new THREE.Vector3(0, 0, -1));",
            "",
            "    // 7. Extra ragdoll force: headless body snaps back hard",
            "    if (this.ragdoll) {",
            "      this.ragdoll.groupVelX *= 2.0;",
            "      this.ragdoll.groupVelZ *= 2.0;",
            "    }",
            "  }",
            ""
        )
        $lines = @($lines[0..($i-1)]) + $explodeMethod + @($lines[$i..($lines.Length-1)])
        break
    }
}

# 2. Update Damage calculation in playerShoot
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match '// Damage calculation') {
        $dmgBlock = @(
            "      // Damage calculation",
            "      let dmg = w.damage;",
            "      const isCloseShotgun = isShotgun && targetDist < 6.5;",
            "",
            "      if (isHeadshot && w.id === 'deagle') {",
            "        dmg = 9999;",
            "      } else if (isHeadshot && isCloseShotgun) {",
            "        dmg = 9999; // Instakill close-range shotgun decapitation",
            "      } else {",
            "        dmg += Math.floor(Math.random() * (isShotgun ? 5 : 18)) + (isHeadshot ? (isShotgun ? 10 : 20) : 0);",
            "      }",
            "",
            "      // Close-range shotgun headshot decapitation & gore explosion",
            "      if (isHeadshot && isCloseShotgun && hitEnemy.alive && !hitEnemy.headDestroyed) {",
            "        hitEnemy.explodeHead(shotDir, enemyHitPoint);",
            "      }"
        )
        # Find where hitEnemy.takeDamage(dmg) is
        $j = $i
        while ($j -lt $lines.Length -and $lines[$j] -notmatch 'hitEnemy\.takeDamage') {
            $j++
        }
        $lines = @($lines[0..($i-1)]) + $dmgBlock + @($lines[$j..($lines.Length-1)])
        break
    }
}

[System.IO.File]::WriteAllLines($path, $lines, [System.Text.Encoding]::UTF8)
Write-Output "APPLIED_GORE_EXACT"
